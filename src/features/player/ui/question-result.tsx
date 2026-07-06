import { useMemo, type Ref } from "react";

import { ThumbsDown, ThumbsUp } from "lucide-react";

import type { Question } from "@/shared/lib/quiz";
import { renderMarkdownField, renderMarkdownFieldText } from "@/shared/lib/render";
import { useSelectedVoice } from "@/shared/lib/speech";
import { MarkdownRender } from "@/shared/ui/markdown";
import { ReadAloudButton } from "@/shared/ui/read-aloud-button";

import { cx } from "#styles";
import styles from "./question-result.module.css";

interface QuestionResultProps {
  question: Question;
  isCorrect: boolean;
  /** Id matching the fieldset's `aria-describedby`, linking verdict to controls. */
  id: string;
  /** Receives focus when the card locks, so the keyboard lands on the result. */
  ref?: Ref<HTMLDivElement>;
}

/** Post-submit verdict + Explanation shown once a Question is locked (T6.x). */
export function QuestionResult({ question, isCorrect, id, ref }: QuestionResultProps) {
  // Null until the user opts into read-aloud by choosing a voice in the footer;
  // the button then hides itself, so no extra conditional is needed here.
  const voice = useSelectedVoice();
  // Render once: the HTML for display, and the flattened text the speech engine
  // reads — speaking the rendered Markdown would voice `**`, links, code fences.
  const explanationHtml = useMemo(
    () => renderMarkdownField("explanation", question.explanation),
    [question.explanation],
  );
  const explanationText = useMemo(
    () => renderMarkdownFieldText("explanation", question.explanation),
    [question.explanation],
  );
  const referencesHtml = useMemo(
    () =>
      question.references === undefined
        ? undefined
        : renderMarkdownField("questionReferences", question.references),
    [question.references],
  );

  return (
    <div role="status" id={id} ref={ref}>
      <div className={cx(styles.result, isCorrect ? styles.resultCorrect : styles.resultIncorrect)}>
        {isCorrect ? (
          <div className={styles.resultText}>
            <ThumbsUp size="14" className={styles.resultIcon} /> Correct!
          </div>
        ) : (
          <div className={styles.resultText}>
            <ThumbsDown size="14" className={styles.resultIcon} /> Incorrect
          </div>
        )}
        <ReadAloudButton text={explanationText} voice={voice} label="Read explanation aloud" />
      </div>
      <MarkdownRender content={explanationHtml} size="m" className={styles.explanation} />
      {referencesHtml !== undefined && (
        <section aria-labelledby={`${id}-references-title`} className={styles.references}>
          <h3 id={`${id}-references-title`} className={styles.referencesTitle}>
            References
          </h3>
          <MarkdownRender content={referencesHtml} size="xs" />
        </section>
      )}
    </div>
  );
}
