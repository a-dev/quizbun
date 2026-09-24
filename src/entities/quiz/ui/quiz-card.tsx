import type { ReactNode } from "react";

import { renderInlineMarkdownExcerpt, renderMarkdownFieldText } from "@/shared/lib/render";
import type { QuizSummary } from "@/shared/lib/storage";
import { Badge } from "@/shared/ui/badge";
import { LinkArrow } from "@/shared/ui/link-arrow";
import { MarkdownRender } from "@/shared/ui/markdown";

import { cx, typography } from "#styles";
import styles from "./quiz-card.module.css";

/** The metadata a card needs; both Library and Catalog summaries satisfy it. */
export type QuizCardSummary = Pick<
  QuizSummary,
  "id" | "title" | "description" | "tags" | "questionCount"
> & {
  /** ISO 8601 timestamp for when the public quiz file was added to the repo. */
  addedAt?: string;
  answeredCount?: number;
};

export interface QuizCardProps {
  summary: QuizCardSummary;
  href: string;
  showDescription?: boolean;
  showCreatedAt?: boolean;
  isPreview?: boolean;
  size?: "s" | "m";
  /** Href for a Tag badge; when set (and not a preview), each badge links there. */
  tagHref?: (tag: string) => string;
  /** Caller-provided actions (Export, delete, …); the card stays data-only. */
  actions?: ReactNode;
}

const addedDateFormatter = new Intl.DateTimeFormat("en", {
  dateStyle: "medium",
  timeZone: "UTC",
});

const SIZE_CLASS = {
  s: styles.sizeS,
  m: styles.sizeM,
};

const TITLE_SIZE_CLASS = {
  s: typography.h4,
  m: typography.h3,
};

const DESCRIPTION_EXCERPT_MAX_LENGTH = 180;

/** Presentational list item for quiz metadata. Knows nothing about storage. */
export function QuizCard({
  summary,
  href,
  showCreatedAt = false,
  showDescription = false,
  isPreview = false,
  size = "m",
  tagHref,
  actions,
}: Readonly<QuizCardProps>) {
  const descriptionExcerpt =
    showDescription && summary.description !== undefined
      ? renderInlineMarkdownExcerpt(firstParagraph(summary.description), {
          maxLength: DESCRIPTION_EXCERPT_MAX_LENGTH,
        })
      : undefined;

  const questionsLabelPluralized = `${summary.questionCount} ${summary.questionCount === 1 ? "question" : "questions"}`;

  return (
    <article
      aria-labelledby={`quiz-title-${summary.id}`}
      className={cx(styles.root, SIZE_CLASS[size])}
    >
      <div className={styles.header}>
        <div className={styles.meta}>
          <span className={styles.counter}>{questionsLabelPluralized}</span>{" "}
          {showCreatedAt && summary.addedAt && (
            <time dateTime={summary.addedAt} className={styles.addedAt}>
              {" "}
              • {addedDateFormatter.format(new Date(summary.addedAt))}
            </time>
          )}
          {!!summary.answeredCount && (
            <span>
              • <span className={styles.answeredCount}>{summary.answeredCount} answered</span>
            </span>
          )}
        </div>
        {actions}
      </div>
      <h3 id={`quiz-title-${summary.id}`} className={TITLE_SIZE_CLASS[size]}>
        {isPreview ? (
          <span className={cx(typography.hLink, styles.titleLink)}>
            {renderMarkdownFieldText("quizTitle", summary.title)}
          </span>
        ) : (
          <a href={href} className={cx(typography.hLink, styles.titleLink)}>
            {renderMarkdownFieldText("quizTitle", summary.title)}
            <LinkArrow size={18} motion="bounce" className={styles.arrowLink} />
          </a>
        )}
      </h3>
      {descriptionExcerpt !== undefined && (
        <MarkdownRender
          as="p"
          content={descriptionExcerpt}
          size="s"
          className={styles.description}
        />
      )}
      {summary.tags.length > 0 && (
        <div aria-label="Tags" className={styles.tags}>
          {summary.tags.map((tag) => (
            <Badge key={tag} size="s" href={isPreview ? undefined : tagHref?.(tag)}>
              {tag}
            </Badge>
          ))}
        </div>
      )}
    </article>
  );
}

/** Excerpt rule: first paragraph, inline tier, capped for card grid stability. */
function firstParagraph(markdown: string): string {
  return markdown.split(/\n\s*\n/, 1)[0].trim();
}
