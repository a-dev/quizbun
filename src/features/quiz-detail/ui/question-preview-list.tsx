import { useMemo } from "react";

import type { Quiz } from "@/shared/lib/quiz";
import { renderMarkdownField } from "@/shared/lib/render";
import type { QuestionProgress } from "@/shared/lib/storage";
import { MarkdownRender } from "@/shared/ui/markdown";

import { shouldEnterInPlace } from "../lib/in-place-navigation";
import { questionOutcome } from "../lib/question-outcome";
import type { QuestionOutcome } from "../lib/question-outcome";

import { cx, typography, utils } from "#styles";
import styles from "./question-preview-list.module.css";

const OUTCOME_LABEL = {
  correct: "Correct",
  incorrect: "Incorrect",
  unanswered: "Not answered",
} satisfies Record<QuestionOutcome, string>;

const OUTCOME_CLASS = {
  correct: styles.outcomeCorrect,
  incorrect: styles.outcomeIncorrect,
  unanswered: styles.outcomeUnanswered,
} satisfies Record<QuestionOutcome, string>;

interface QuestionPreviewListProps {
  quiz: Quiz;
  answers: Readonly<Record<string, QuestionProgress>> | undefined;
  questionHref: (questionId: string) => string;
  onQuestionSelect: (questionId: string) => void;
}

/** SSR-visible Question titles with client-only Run outcomes. */
export function QuestionPreviewList({
  quiz,
  answers,
  questionHref,
  onQuestionSelect,
}: QuestionPreviewListProps) {
  const titles = useMemo(
    () => quiz.questions.map((question) => renderMarkdownField("questionTitle", question.title)),
    [quiz.questions],
  );

  return (
    <section aria-labelledby="question-preview-title" className={styles.root}>
      <h2 id="question-preview-title" className={typography.h2}>
        Questions
      </h2>

      <ol className={styles.list} role="list">
        {quiz.questions.map((question, index) => {
          const outcome = questionOutcome(answers, question.id);

          return (
            <li key={question.id} className={styles.item}>
              <div aria-hidden="true" className={cx(styles.position, OUTCOME_CLASS[outcome])}>
                {index + 1}
              </div>
              {/* <span className={utils.visuallyHidden}>{OUTCOME_LABEL[outcome]}. </span> */}
              {/* <span aria-hidden="true" className={cx(styles.outcome, OUTCOME_CLASS[outcome])} /> */}
              <a
                className={styles.link}
                href={questionHref(question.id)}
                // The words are already indexed here; the target serves the
                // same HTML under a query param and only spends crawl budget
                // (PRD §5). Real `href`, so deep-link and copy still work.
                rel="nofollow"
                onClick={(event) => {
                  if (!shouldEnterInPlace(event)) return;

                  event.preventDefault();
                  onQuestionSelect(question.id);
                }}
              >
                <MarkdownRender as="span" content={titles[index]!} size="m" />
              </a>
            </li>
          );
        })}
      </ol>
    </section>
  );
}
