import type { Ref } from "react";

import type { Quiz } from "@/shared/lib/quiz";
import { renderMarkdownFieldText } from "@/shared/lib/render";
import { Badge } from "@/shared/ui/badge";
import { BackButton } from "@/shared/ui/breadcrumbs";
import { Button } from "@/shared/ui/button";
import { Note } from "@/shared/ui/note";

import type { Answers } from "../model/run-engine";
import { countCorrect } from "../model/run-engine";

import { layout, typography } from "#styles";
import styles from "./summary.module.css";

/** Length budget for the per-Question preview — short enough to scan, long enough to identify. */
const MAX_PREVIEW_LENGTH = 90;

/** Maps a Run score onto a Note severity: all correct = success, none = error, mixed = warning. */
function scoreNoteType(correct: number, total: number) {
  if (correct === total) {
    return "success";
  }
  if (correct === 0) {
    return "error";
  }
  return "warning";
}

/**
 * Plain-text, length-capped preview of a Question's title so a Run result is
 * identifiable in the list without re-rendering the whole Question. The title
 * is an `inline`-tier Markdown field; we strip formatting and cut at the last
 * word boundary inside the budget rather than slicing mid-word.
 */
function previewTitle(title: string): string {
  const text = renderMarkdownFieldText("questionTitle", title).trim();
  if (text.length <= MAX_PREVIEW_LENGTH) {
    return text;
  }

  const slice = text.slice(0, MAX_PREVIEW_LENGTH);
  const lastSpace = slice.lastIndexOf(" ");
  return `${slice.slice(0, lastSpace > 0 ? lastSpace : MAX_PREVIEW_LENGTH).trimEnd()}…`;
}

interface SummaryProps {
  quiz: Quiz;
  answers: Answers;
  /** Receives focus when the player swaps the Summary in (keyboard flow). */
  headingRef?: Ref<HTMLHeadingElement>;
  /** Navigates back to a Question's page so its Explanation is visible. */
  onReviewQuestion: (questionId: string) => void;
  onRetake: () => void;
  onBack: () => void;
}

/** Run Summary (T6.6): "X of Y correct" plus the per-Question result list. */
export function Summary({
  quiz,
  answers,
  headingRef,
  onReviewQuestion,
  onRetake,
  onBack,
}: SummaryProps) {
  const correct = countCorrect(quiz, answers);
  const total = quiz.questions.length;

  return (
    <section aria-labelledby="run-summary-title" className={layout.section}>
      <BackButton onClick={onBack}>Back</BackButton>
      <h2 id="run-summary-title" ref={headingRef} className={typography.h1}>
        Summary
      </h2>

      <Note type={scoreNoteType(correct, total)} className={typography.body}>
        {correct} of {total} correct
      </Note>

      <ol className={styles.list}>
        {quiz.questions.map((question, index) => {
          const isCorrect = answers[question.id]?.isCorrect === true;

          return (
            <li key={question.id} className={styles.item}>
              <span className={styles.position}>{index + 1}</span>
              <Badge className={styles.badge} intent={isCorrect ? "success" : "error"}>
                {isCorrect ? "Correct" : "Incorrect"}
              </Badge>
              <Button
                className={styles.review}
                size="s"
                variant="ghost"
                onClick={() => onReviewQuestion(question.id)}
              >
                Review
              </Button>
              <p className={styles.preview}>{previewTitle(question.title)}</p>
            </li>
          );
        })}
      </ol>

      <Button onClick={onRetake} className={styles.retake}>
        Retake
      </Button>
    </section>
  );
}
