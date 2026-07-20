import type { CSSProperties } from "react";

import { cx } from "#styles";
import styles from "./prose.module.css";

export type MarkdownSize = "xs" | "s" | "m" | "article";

type Props = {
  /**
   * Pre-sanitized HTML — the output of the render lib (e.g. renderMarkdownField
   * for block content, renderInlineMarkdown for inline). Never raw, untrusted
   * HTML: this is injected verbatim via dangerouslySetInnerHTML.
   */
  content: string;
  /** Type scale + spacing preset. "s" for previews/answers, "m" for body copy. */
  size?: MarkdownSize;
  /**
   * Wrapper element. Defaults to a block "div"; use "span" for inline-tier
   * content that must sit in the text flow (e.g. an answer option beside its
   * radio), or "p" for a single inline excerpt that should read as a paragraph
   * (e.g. a card preview). Inline tiers never contain block tags, so neither
   * "span" nor "p" can nest a block child.
   */
  as?: "div" | "span" | "p" | "legend";
  className?: string;
  /**
   * Integration boundary for caller-owned inline styles — today only a
   * per-quiz `view-transition-name`, which is a dynamic ident and so cannot
   * live in a stylesheet class.
   */
  style?: CSSProperties;
};

// Typed class lookup (not styles[`size-${size}`], which is undefined under
// camelCaseOnly). `satisfies` makes a new MarkdownSize a compile error here
// until the matching .size-* class exists in the prose module. The `article`
// size is intentionally absent: it is the docs <article>'s scale, not a quiz one.
const sizeClass = {
  xs: styles.sizeXs,
  s: styles.sizeS,
  m: styles.sizeM,
  article: styles.sizeArticle,
} satisfies Record<MarkdownSize, string>;

export function MarkdownRender({ content, size = "m", as: Tag = "div", className, style }: Props) {
  return (
    <Tag
      className={cx(styles.prose, sizeClass[size], className)}
      style={style}
      dangerouslySetInnerHTML={{ __html: content }}
    />
  );
}
