import {
  renderInlineMarkdown,
  renderInlineMarkdownPlainText,
  renderMarkdown,
  renderMarkdownPlainText,
} from "./markdown";

/**
 * Tier assignment for every Markdown-bearing field of the Standard.
 * Mirrors docs/standard.md, "two tiers":
 *
 * - `inline` — short fields, inline tokens only.
 * - `full`   — long fields, full Markdown.
 * - `plain`  — never rendered as Markdown (Tags).
 */
export type MarkdownTier = "full" | "inline" | "plain";

export type MarkdownField =
  | "acceptedAnswerDisplay"
  | "explanation"
  | "optionText"
  | "questionDescription"
  | "questionReferences"
  | "questionTitle"
  | "quizDescription"
  | "quizTitle"
  | "tag";

export const MARKDOWN_FIELD_TIERS: Record<MarkdownField, MarkdownTier> = {
  acceptedAnswerDisplay: "inline",
  explanation: "full",
  optionText: "inline",
  questionDescription: "full",
  questionReferences: "full",
  questionTitle: "inline",
  quizDescription: "full",
  quizTitle: "inline",
  tag: "plain",
};

// Tags are plain strings, never Markdown, so they bypass marked/sanitize-html
// entirely. They still reach HTML, so the literal text must be escaped — `&`
// first so it cannot double-escape the entities introduced afterwards.
function escapeHtml(text: string): string {
  return text
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

/** Renders a field through its tier. Always returns HTML-safe output. */
export function renderMarkdownField(field: MarkdownField, value: string): string {
  switch (MARKDOWN_FIELD_TIERS[field]) {
    case "full":
      return renderMarkdown(value);
    case "inline":
      return renderInlineMarkdown(value);
    case "plain":
      return escapeHtml(value);
  }
}

/** Renders a field through its tier, then strips formatting for plain-text contexts. */
export function renderMarkdownFieldText(field: MarkdownField, value: string): string {
  switch (MARKDOWN_FIELD_TIERS[field]) {
    case "full":
      return renderMarkdownPlainText(value);
    case "inline":
      return renderInlineMarkdownPlainText(value);
    case "plain":
      // Plain-text output is bound as text (React/Astro escape it on the way
      // out), so returning the raw tag is correct — escaping here would surface
      // as visible `&amp;`. This is the deliberate counterpart to escapeHtml.
      return value;
  }
}
