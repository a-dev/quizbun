import type { ReactNode } from "react";

import { ArrowRight } from "lucide-react";

import { renderInlineMarkdownExcerpt, renderMarkdownFieldText } from "@/shared/lib/render";
import type { QuizSummary } from "@/shared/lib/storage";
import { quizTransitionStyle } from "@/shared/lib/view-transition";
import type { QuizTransitionPart } from "@/shared/lib/view-transition";
import { Badge } from "@/shared/ui/badge";
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
  /**
   * Opt into the shared-element view transition toward the quiz page: title,
   * tags, description, and question counter get per-quiz `view-transition-name`s.
   * At most one card per quiz id may opt in on a page — a duplicate name makes
   * the browser skip the whole transition.
   */
  morph?: boolean;
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
  morph = false,
  actions,
}: QuizCardProps) {
  // Inline by necessity: `view-transition-name` is a per-quiz dynamic ident,
  // so it cannot live in a stylesheet class.
  const morphStyle = (part: QuizTransitionPart) =>
    morph ? quizTransitionStyle(part, summary.id) : undefined;

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
          <span className={styles.counter} style={morphStyle("count")}>
            {questionsLabelPluralized}
          </span>{" "}
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
            <>
              {/* Name the text span, not the heading, so the arrow icon stays
                  out of the title morph. */}
              <span style={morphStyle("title")}>
                {renderMarkdownFieldText("quizTitle", summary.title)}
              </span>
              <ArrowRight size="18" className={styles.arrowLink} />
            </>
          </a>
        )}
      </h3>
      {descriptionExcerpt !== undefined && (
        <MarkdownRender
          as="p"
          content={descriptionExcerpt}
          size="s"
          className={styles.description}
          style={morphStyle("description")}
        />
      )}
      {summary.tags.length > 0 && (
        <div aria-label="Tags" className={styles.tags} style={morphStyle("tags")}>
          {summary.tags.map((tag) => (
            <Badge key={tag} size="s">
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
