// ============================================================================
// Markdown rendering pipeline
//
// Quiz content (author-written or AI-generated, possibly imported from an
// untrusted JSON file) is rendered as Markdown. Two stages run, always in this
// order — the order is the security boundary:
//
//   1. marked        Markdown -> HTML. Fast and spec-compliant, but performs NO
//                    sanitization: raw HTML in the source (e.g. <script>) passes
//                    straight through. Its output is therefore untrusted.
//   2. sanitize-html The trust boundary. Allow-lists tags, attributes and URL
//                    schemes; everything else (script/style/event handlers,
//                    javascript:/data: URLs, unknown tags) is stripped. Nothing
//                    reaches the DOM without passing through here.
//
// Three more libraries post-process the *already-sanitized* HTML, for plain-text
// extraction and length-limited excerpts. Because their input is sanitized,
// these steps can only ever remove content — never reintroduce danger:
//
//   3. htmlparser2   Parses the sanitized HTML string back into a DOM tree.
//   4. domhandler    Node types (Text/Element) and type guards for that tree;
//                    also used to build the ellipsis Text node.
//   5. dom-serializer Serializes the (truncated) tree back into an HTML string.
//
// 3-5 are the same ecosystem htmlparser2 already pulls in, and htmlparser2 is a
// dependency of sanitize-html — so declaring them directly adds no bundle
// weight, it only makes the imports explicit.
// ============================================================================

import renderHtml from "dom-serializer";
import { Text, hasChildren, isTag, isText, type ChildNode, type Element } from "domhandler";
import { parseDocument } from "htmlparser2";
import { marked } from "marked";
import Prism from "prismjs";
// Grammar registrations (side-effecting imports). HTML (Prism's `markup`), CSS,
// and JavaScript ship in Prism core, so they need no import here. Order matters
// where one grammar extends another: tsx builds on jsx + typescript.
import "prismjs/components/prism-bash.js";
import "prismjs/components/prism-json.js";
import "prismjs/components/prism-python.js";
import "prismjs/components/prism-sql.js";
import "prismjs/components/prism-typescript.js";
import "prismjs/components/prism-jsx.js";
import "prismjs/components/prism-tsx.js";
import sanitizeHtml, { type IOptions as SanitizeHtmlOptions } from "sanitize-html";

// `async: false` forces marked to return a string (not a Promise). `gfm` enables
// GitHub-flavored Markdown; `breaks: false` keeps single newlines as soft wraps.
const MARKDOWN_OPTIONS = {
  async: false,
  breaks: false,
  gfm: true,
} as const;

const DEFAULT_EXCERPT_MAX_WORD_LENGTH = 32;

// Tag taxonomy — the single source of truth behind every tag list below, so the
// sanitizer allow-lists and plain-text extraction can never drift apart:
//
//   inline tier allow-list = INLINE_TAGS
//   full tier allow-list   = INLINE_TAGS + BLOCK_TAGS
//   plain-text separators  = BLOCK_TAGS
//
// Inline tags sit within a line; block tags open a new one, so their boundaries
// must become whitespace when flattening to text (otherwise `<p>a</p><p>b</p>`
// would collapse to "ab"). `<br>` is the exception — inline, but a line break —
// so extractText handles it explicitly rather than through these sets.
const INLINE_TAGS = ["a", "br", "code", "em", "strong"];
const BLOCK_TAGS = [
  "blockquote",
  "h1",
  "h2",
  "h3",
  "h4",
  "li",
  "ol",
  "p",
  "pre",
  "table",
  "tbody",
  "td",
  "th",
  "thead",
  "tr",
  "ul",
];

// Derived from BLOCK_TAGS, so it stays in lockstep with what the sanitizer emits
// — e.g. h5/h6 are stripped by the allow-list, so they are correctly absent here
// too (a hand-written list previously carried them as unreachable dead entries).
const PLAIN_TEXT_BLOCK_TAGS = new Set(BLOCK_TAGS);
const LANGUAGE_CLASS_PATTERN = /^language-[a-z0-9-]+$/;
const TOKEN_CLASS_PATTERN = /^[a-z][a-z0-9-]*$/;

// Markdown fence info string -> Prism grammar name. The supported set is Renderer
// behavior; keep it in sync with the author-facing docs (docs/standard.md Markdown
// section, the AI generation prompt, and the quizbun-author skill). An unlisted
// fence renders un-highlighted by design — see highlightPreCodeBlock.
const PRISM_LANGUAGE_BY_MARKDOWN_LANGUAGE = {
  bash: "bash",
  css: "css",
  html: "markup",
  javascript: "javascript",
  js: "javascript",
  json: "json",
  jsx: "jsx",
  py: "python",
  python: "python",
  sh: "bash",
  shell: "bash",
  sql: "sql",
  ts: "typescript",
  tsx: "tsx",
  typescript: "typescript",
} as const;

type MarkdownCodeLanguage = keyof typeof PRISM_LANGUAGE_BY_MARKDOWN_LANGUAGE;

// ----------------------------------------------------------------------------
// Sanitizer configuration (the allow-lists that define what HTML is permitted)
// ----------------------------------------------------------------------------

// Rebuilds every `<a>` from scratch so only a vetted href survives, and tags
// external links with rel="noreferrer" (strips the Referer header and implies
// noopener). A hrefless link keeps no attributes at all.
const transformAnchor: NonNullable<SanitizeHtmlOptions["transformTags"]>[string] = (
  _tagName,
  attribs,
) => {
  const href = attribs.href?.trim();

  if (!href) {
    return {
      attribs: {},
      tagName: "a",
    };
  }

  const transformedAttribs: Record<string, string> = { href };

  if (/^https?:\/\//i.test(href)) {
    transformedAttribs.rel = "noreferrer";
  }

  return {
    attribs: transformedAttribs,
    tagName: "a",
  };
};

// Inline tier: emphasis, code spans and links only — no block elements ever.
const INLINE_SANITIZE_OPTIONS: SanitizeHtmlOptions = {
  allowedAttributes: {
    a: ["href", "rel"],
  },
  // Anything not http/https/mailto (javascript:, data:, vbscript:, …) is dropped.
  allowedSchemes: ["http", "https", "mailto"],
  allowedTags: [...INLINE_TAGS],
  allowProtocolRelative: false,
  transformTags: {
    a: transformAnchor,
  },
};

// Full tier: the inline set plus block structure (headings, lists, tables, …).
const SANITIZE_OPTIONS: SanitizeHtmlOptions = {
  allowedAttributes: {
    a: ["href", "rel"],
    code: ["class"], // marked emits `language-*` classes on fenced code blocks.
  },
  allowedClasses: {
    code: [LANGUAGE_CLASS_PATTERN],
  },
  allowedSchemes: ["http", "https", "mailto"],
  allowedTags: [...INLINE_TAGS, ...BLOCK_TAGS],
  allowProtocolRelative: false,
  transformTags: {
    a: transformAnchor,
    // Demote `<h1>` to `<h2>`: the page already owns the single top-level
    // heading, so quiz content must not introduce a competing one.
    h1: (_tagName, attribs) => ({
      attribs,
      tagName: "h2",
    }),
  },
};

const HIGHLIGHTED_SANITIZE_OPTIONS: SanitizeHtmlOptions = {
  ...SANITIZE_OPTIONS,
  allowedAttributes: {
    a: ["href", "rel"],
    code: ["class"],
    pre: ["class"],
    span: ["class"],
  },
  allowedClasses: {
    code: [LANGUAGE_CLASS_PATTERN],
    pre: [LANGUAGE_CLASS_PATTERN],
    span: [TOKEN_CLASS_PATTERN],
  },
  allowedTags: [...INLINE_TAGS, "span", ...BLOCK_TAGS],
};

// ----------------------------------------------------------------------------
// Markdown -> safe HTML (the two render tiers)
// ----------------------------------------------------------------------------

/** Markdown -> sanitized HTML. This is the trust boundary; output is safe HTML. */
function markdownToSafeHtml(markdown: string): string {
  if (markdown.trim().length === 0) {
    return "";
  }

  // marked does not sanitize — sanitizeHtml is what makes this output safe.
  const safeHtml = sanitizeHtml(marked.parse(markdown, MARKDOWN_OPTIONS), SANITIZE_OPTIONS);

  return highlightCodeBlocks(safeHtml);
}

/** Full tier: block-level Markdown with GitHub-style heading anchors. */
export function renderMarkdown(markdown: string): string {
  return addHeadingIds(markdownToSafeHtml(markdown));
}

/**
 * Inline tier: emphasis, code spans, and links only — never block elements.
 * Block Markdown in a short field degrades to literal text per the standard's
 * degradation rule. Output carries no wrapping `<p>`, so it is safe to drop
 * inside a `<label>` or list item.
 */
export function renderInlineMarkdown(markdown: string): string {
  if (markdown.trim().length === 0) {
    return "";
  }

  // Still the trust boundary: parseInline avoids block wrappers, not sanitizing.
  return sanitizeHtml(marked.parseInline(markdown, MARKDOWN_OPTIONS), INLINE_SANITIZE_OPTIONS);
}

// ----------------------------------------------------------------------------
// Syntax highlighting
// ----------------------------------------------------------------------------

function highlightCodeBlocks(html: string): string {
  // `html` is already sanitized by the caller. With no fenced code block there is
  // nothing to highlight, and the re-sanitize pass below would only repeat work
  // the first pass did — its allow-list differs only by permitting `pre`/`span`
  // classes, which code-free content cannot contain. So return it untouched.
  if (!html.includes("<pre")) {
    return html;
  }

  const nodes = parseHtmlFragment(html);

  highlightCodeBlocksInNodes(nodes);

  return sanitizeHtml(renderHtmlFragment(nodes), HIGHLIGHTED_SANITIZE_OPTIONS);
}

function highlightCodeBlocksInNodes(nodes: ChildNode[]): void {
  for (const node of nodes) {
    if (!isTag(node)) {
      continue;
    }

    if (node.name === "pre") {
      highlightPreCodeBlock(node);
      continue;
    }

    if (hasChildren(node)) {
      highlightCodeBlocksInNodes(node.children);
    }
  }
}

function highlightPreCodeBlock(pre: Element): void {
  const code = pre.children.find(
    (child): child is Element => isTag(child) && child.name === "code",
  );

  if (code === undefined) {
    return;
  }

  const markdownLanguage = getMarkdownCodeLanguage(code.attribs.class);

  if (markdownLanguage === undefined) {
    return;
  }

  const prismLanguage = PRISM_LANGUAGE_BY_MARKDOWN_LANGUAGE[markdownLanguage];
  const grammar = Prism.languages[prismLanguage];

  if (grammar === undefined) {
    return;
  }

  const languageClass = `language-${markdownLanguage}`;
  const highlightedHtml = Prism.highlight(
    extractText(code.children, { separateBlocks: false }),
    grammar,
    prismLanguage,
  );

  pre.attribs.class = languageClass;
  code.attribs.class = languageClass;
  code.children = parseHtmlFragment(highlightedHtml);
}

function getMarkdownCodeLanguage(className: string | undefined): MarkdownCodeLanguage | undefined {
  const language = className
    ?.split(/\s+/)
    .map((part) => part.match(/^language-([a-z0-9-]+)$/)?.[1])
    .find(
      (part): part is MarkdownCodeLanguage =>
        part !== undefined && part in PRISM_LANGUAGE_BY_MARKDOWN_LANGUAGE,
    );

  return language;
}

// ----------------------------------------------------------------------------
// Heading anchors
// ----------------------------------------------------------------------------

function createHeadingSlug(text: string): string {
  const baseSlug = text
    .replace(/<[^>]+>/g, " ")
    .toLowerCase()
    .trim()
    .replace(/&[a-z0-9#]+;/gi, " ")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

  return baseSlug.length > 0 ? baseSlug : "section";
}

/**
 * Adds GitHub-style slug ids to bare `<h1>`–`<h6>` tags so in-page anchors work.
 * Runs on already-sanitized HTML, where marked's heading markup is stable and
 * trusted, so a regex is sufficient and no re-parse is needed.
 */
export function addHeadingIds(html: string): string {
  const seenHeadings = new Map<string, number>();

  return html.replace(/<h([1-6])>(.*?)<\/h\1>/g, (_match, level, content) => {
    const baseSlug = createHeadingSlug(content);
    const duplicateCount = seenHeadings.get(baseSlug) ?? 0;
    const nextCount = duplicateCount + 1;

    seenHeadings.set(baseSlug, nextCount);

    // Disambiguate repeated headings: "intro", "intro-2", "intro-3", …
    const slug = nextCount === 1 ? baseSlug : `${baseSlug}-${nextCount}`;

    return `<h${level} id="${slug}">${content}</h${level}>`;
  });
}

// ----------------------------------------------------------------------------
// Plain-text extraction (for titles, labels, attributes, meta tags)
// ----------------------------------------------------------------------------

/** Renders the full tier, then returns its visible text only. */
export function renderMarkdownPlainText(markdown: string): string {
  return htmlToPlainText(markdownToSafeHtml(markdown));
}

/** Renders the inline tier, then returns its visible text only. */
export function renderInlineMarkdownPlainText(markdown: string): string {
  return htmlToPlainText(renderInlineMarkdown(markdown));
}

/** Collapses sanitized HTML to its visible text, with blocks kept word-separated. */
function htmlToPlainText(html: string): string {
  return normalizePlainText(extractText(parseHtmlFragment(html), { separateBlocks: true }));
}

function parseHtmlFragment(html: string): ChildNode[] {
  // decodeEntities turns `&amp;` back into `&` in text nodes, so visible-text
  // counting sees one character; dom-serializer re-encodes it on the way out.
  return parseDocument(html, { decodeEntities: true }).children;
}

function renderHtmlFragment(nodes: ChildNode[]): string {
  // encodeEntities: "utf8" re-encodes only the HTML-significant characters
  // (& < > "), mirroring the decode in parseHtmlFragment.
  return renderHtml(nodes, { encodeEntities: "utf8" });
}

interface ExtractTextOptions {
  /**
   * When true, wrap block-level elements in newlines so neighbouring blocks stay
   * word-separated. The excerpt path leaves it off: it needs grapheme offsets to
   * line up exactly with the text nodes it later truncates, and inline HTML has
   * no block tags anyway.
   */
  separateBlocks: boolean;
}

/** Concatenates the visible text of a parsed fragment (`<br>` becomes a newline). */
function extractText(nodes: readonly ChildNode[], options: ExtractTextOptions): string {
  let text = "";

  for (const node of nodes) {
    if (isText(node)) {
      text += node.data;
      continue;
    }

    if (isTag(node) && node.name === "br") {
      text += "\n";
      continue;
    }

    if (!hasChildren(node)) {
      continue;
    }

    const inner = extractText(node.children, options);

    text +=
      options.separateBlocks && isTag(node) && PLAIN_TEXT_BLOCK_TAGS.has(node.name)
        ? `\n${inner}\n`
        : inner;
  }

  return text;
}

function normalizePlainText(text: string): string {
  return text.replace(/\s+/g, " ").trim();
}

// ----------------------------------------------------------------------------
// Inline excerpts (length-limited summaries that keep their inline markup)
// ----------------------------------------------------------------------------

export interface InlineMarkdownExcerptOptions {
  maxLength: number;
  maxWordLength?: number;
  ellipsis?: string;
}

/**
 * Renders inline Markdown, then truncates by visible text while preserving the
 * sanitized HTML tree (tags stay balanced and closed). Normal words are omitted
 * whole; a single very long word may be cut at a grapheme boundary so card grids
 * cannot be stretched indefinitely.
 */
export function renderInlineMarkdownExcerpt(
  markdown: string,
  {
    ellipsis = "...",
    maxLength,
    maxWordLength = DEFAULT_EXCERPT_MAX_WORD_LENGTH,
  }: InlineMarkdownExcerptOptions,
): string {
  const html = renderInlineMarkdown(markdown);
  // separateBlocks: false — offsets must map 1:1 onto the text nodes below.
  const text = extractText(parseHtmlFragment(html), { separateBlocks: false });
  const cutLength = findExcerptCutLength(text, {
    ellipsis,
    maxLength,
    maxWordLength,
  });

  if (cutLength === undefined) {
    return html;
  }

  return truncateHtmlFragment(html, cutLength, ellipsis);
}

interface ExcerptCutOptions {
  ellipsis: string;
  maxLength: number;
  maxWordLength: number;
}

/**
 * Decides how many visible graphemes to keep, or `undefined` if the text fits.
 * Prefers a word boundary; only forces a mid-word cut when the first word alone
 * already exceeds `maxWordLength`.
 */
function findExcerptCutLength(
  text: string,
  { ellipsis, maxLength, maxWordLength }: ExcerptCutOptions,
): number | undefined {
  const textGraphemes = splitGraphemes(text);

  if (textGraphemes.length <= maxLength) {
    return undefined;
  }

  const ellipsisLength = splitGraphemes(ellipsis).length;
  const targetLength = Math.max(0, maxLength - ellipsisLength);
  const candidate = textGraphemes.slice(0, targetLength).join("");
  const wordBoundaryLength = getLastWordBoundaryLength(candidate);

  if (wordBoundaryLength > 0) {
    return wordBoundaryLength;
  }

  const firstWordLength = getFirstWordLength(text);
  const forcedCutLength =
    firstWordLength > maxWordLength ? Math.min(targetLength, maxWordLength) : targetLength;

  return trimEndGraphemeLength(textGraphemes.slice(0, forcedCutLength).join(""));
}

function getLastWordBoundaryLength(text: string): number {
  const graphemes = splitGraphemes(text);

  for (let index = graphemes.length - 1; index >= 0; index -= 1) {
    if (/\s/u.test(graphemes[index] ?? "")) {
      return trimEndGraphemeLength(graphemes.slice(0, index).join(""));
    }
  }

  return 0;
}

function getFirstWordLength(text: string): number {
  const firstWord = text.match(/^\S+/u)?.[0] ?? "";

  return splitGraphemes(firstWord).length;
}

function trimEndGraphemeLength(text: string): number {
  return splitGraphemes(text.trimEnd()).length;
}

// Splits on grapheme clusters (not UTF-16 code units) so emoji and combined
// characters are never cut in half. Falls back to spread for older runtimes.
function splitGraphemes(text: string): string[] {
  if (typeof Intl.Segmenter === "function") {
    const segmenter = new Intl.Segmenter("en", { granularity: "grapheme" });

    return [...segmenter.segment(text)].map(({ segment }) => segment);
  }

  return [...text];
}

interface HtmlTruncationState {
  remaining: number;
  truncated: boolean;
}

/**
 * Walks the parsed (sanitized) tree, keeping `cutLength` visible graphemes and
 * dropping the rest in place, then re-serializes. The tree is only ever pruned,
 * so no unsafe markup can appear; the appended ellipsis is a plain Text node.
 */
function truncateHtmlFragment(html: string, cutLength: number, ellipsis: string): string {
  const nodes = parseHtmlFragment(html);
  const state = {
    remaining: cutLength,
    truncated: false,
  };

  truncateChildren(nodes, state, ellipsis);

  return renderHtmlFragment(nodes);
}

// `appendEllipsis` is false while recursing into a child element: the ellipsis
// belongs after the whole element, appended by the caller, not mid-subtree.
function truncateChildren(
  children: ChildNode[],
  state: HtmlTruncationState,
  ellipsis: string,
  appendEllipsis = true,
): void {
  for (let index = 0; index < children.length; index += 1) {
    const child = children[index];

    if (child === undefined) {
      continue;
    }

    if (isText(child)) {
      truncateTextNode(children, index, child, state, ellipsis, appendEllipsis);

      if (state.truncated) {
        return;
      }

      continue;
    }

    if (isTag(child) && child.name === "br") {
      truncateBreakNode(children, index, state, ellipsis, appendEllipsis);

      if (state.truncated) {
        return;
      }

      continue;
    }

    if (hasChildren(child)) {
      truncateChildren(child.children, state, ellipsis, false);

      if (state.truncated) {
        // Drop the elements that followed the one we cut inside, then place the
        // ellipsis after that element so it sits outside the closed tag.
        children.splice(index + 1);
        appendEllipsisNode(children, index, ellipsis, appendEllipsis);

        return;
      }
    }
  }
}

function truncateTextNode(
  siblings: ChildNode[],
  index: number,
  node: Text,
  state: HtmlTruncationState,
  ellipsis: string,
  appendEllipsis: boolean,
): void {
  const graphemes = splitGraphemes(node.data);

  if (graphemes.length <= state.remaining) {
    state.remaining -= graphemes.length;

    return;
  }

  node.data = graphemes.slice(0, state.remaining).join("").trimEnd();
  state.truncated = true;
  siblings.splice(index + 1);
  appendEllipsisNode(siblings, index, ellipsis, appendEllipsis);
}

function truncateBreakNode(
  siblings: ChildNode[],
  index: number,
  state: HtmlTruncationState,
  ellipsis: string,
  appendEllipsis: boolean,
): void {
  // A `<br>` counts as one visible grapheme (the newline it stands for).
  if (state.remaining > 0) {
    state.remaining -= 1;

    return;
  }

  siblings.splice(index);

  if (appendEllipsis) {
    siblings.splice(index, 0, new Text(ellipsis));
  }

  state.truncated = true;
}

function appendEllipsisNode(
  siblings: ChildNode[],
  index: number,
  ellipsis: string,
  appendEllipsis: boolean,
): void {
  if (appendEllipsis) {
    siblings.splice(index + 1, 0, new Text(ellipsis));
  }
}
