import { Marked } from "marked";
import sanitizeHtml, { type IOptions as SanitizeHtmlOptions } from "sanitize-html";

import { addHeadingIds } from "../render/markdown";
import { type DocLinkContext, resolveDocLink } from "./rewrite-links";

/**
 * Docs-tier Markdown rendering: unlike quiz content (two restricted tiers),
 * repo docs are trusted prose, so the full heading hierarchy survives
 * (T1.2). Raw HTML is still stripped — the docs pipeline shares the
 * "Markdown in, sanitized HTML out" contract with the quiz renderer.
 */

const DOCS_SANITIZE_OPTIONS: SanitizeHtmlOptions = {
  allowedAttributes: {
    a: ["href", "rel"],
    code: ["class"],
  },
  allowedSchemes: ["http", "https", "mailto"],
  allowedTags: [
    "a",
    "blockquote",
    "br",
    "code",
    "em",
    "h1",
    "h2",
    "h3",
    "h4",
    "h5",
    "h6",
    "hr",
    "li",
    "ol",
    "p",
    "pre",
    "strong",
    "table",
    "tbody",
    "td",
    "th",
    "thead",
    "tr",
    "ul",
  ],
  allowProtocolRelative: false,
  transformTags: {
    a: (_tagName, attribs) => {
      const href = attribs.href?.trim();

      if (!href) {
        return { attribs: {}, tagName: "a" };
      }

      const transformedAttribs: Record<string, string> = { href };

      if (/^https?:\/\//i.test(href)) {
        transformedAttribs.rel = "noreferrer";
      }

      return { attribs: transformedAttribs, tagName: "a" };
    },
  },
};

const GITHUB_ALERT_LABELS: Readonly<Record<string, string>> = {
  CAUTION: "Caution",
  IMPORTANT: "Important",
  NOTE: "Note",
  TIP: "Tip",
  WARNING: "Warning",
};

/**
 * GitHub renders `> [!WARNING]` blockquotes as styled alerts; marked leaves
 * the marker as literal text. Replace the marker line with a bold label so
 * the rendered docs read naturally.
 */
function replaceGithubAlertMarkers(markdown: string): string {
  return markdown.replace(
    /^> \[!(NOTE|TIP|IMPORTANT|WARNING|CAUTION)\]\s*$/gm,
    (_match, kind: string) => `> **${GITHUB_ALERT_LABELS[kind]}:**`,
  );
}

export function renderDocMarkdown(markdown: string, linkContext: DocLinkContext): string {
  const renderer = new Marked({
    async: false,
    breaks: false,
    gfm: true,
    walkTokens: (token) => {
      if (token.type === "link" || token.type === "image") {
        token.href = resolveDocLink(token.href, linkContext);
      }
    },
  });

  const renderedHtml = renderer.parse(replaceGithubAlertMarkers(markdown), {
    async: false,
  });
  const sanitizedHtml = sanitizeHtml(renderedHtml, DOCS_SANITIZE_OPTIONS);

  return addHeadingIds(sanitizedHtml);
}
