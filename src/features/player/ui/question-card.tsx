import { memo, useEffect, useId, useMemo, useRef } from "react";

import { checkAnswer } from "@/shared/lib/quiz";
import type { Question } from "@/shared/lib/quiz";
import { renderMarkdownField } from "@/shared/lib/render";
import type { QuestionProgress, SubmittedAnswer } from "@/shared/lib/storage";
import { Button } from "@/shared/ui/button";
import { MarkdownRender } from "@/shared/ui/markdown";

import { useAnswerDraft } from "../model/use-answer-draft";
import { AnswerControl } from "./answer-control";
import { QuestionResult } from "./question-result";

import styles from "./question-card.module.css";

interface Props {
  question: Question;
  /** Index in the Quiz's original Question order (0-based). */
  index: number;
  /** Present iff the Question is submitted; the card then renders locked. */
  progress: QuestionProgress | undefined;
  /** Display-only order of original JSON Option indexes. */
  optionOrder: readonly number[] | undefined;
  onSubmit: (question: Question, answer: SubmittedAnswer, isCorrect: boolean) => void;
}

/**
 * One Question, with its draft, lock/result state, and Explanation. Wrapped in
 * `memo` because the parent re-chunks (new page objects) on every submit;
 * without it, submitting one Question re-renders every other card on the page.
 */
export const QuestionCard = memo(function QuestionCard({
  question,
  index,
  progress,
  optionOrder,
  onSubmit,
}: Props) {
  const idPrefix = useId();
  const { answer, isLocked, submittable, inputError, setDraft, takeSubmittable } = useAnswerDraft(
    question,
    progress,
  );

  const resultRef = useRef<HTMLDivElement>(null);
  // Bridges the submit action to the later locked render: focus the result only
  // when the user just produced it, not when reviewing an already-answered Run.
  const justSubmitted = useRef(false);

  // Title/description Markdown is stable for a given Question; render once.
  const titleHtml = useMemo(
    () => renderMarkdownField("questionTitle", question.title),
    [question.title],
  );
  const descriptionHtml = useMemo(
    () =>
      question.description === undefined
        ? undefined
        : renderMarkdownField("questionDescription", question.description),
    [question.description],
  );

  // The Submit button unmounts when the card locks; without this, keyboard
  // focus falls back to <body>. Move it to the result the user just produced.
  useEffect(() => {
    if (isLocked && justSubmitted.current) {
      justSubmitted.current = false;
      resultRef.current?.focus();
    }
  }, [isLocked]);

  function submit() {
    const toSubmit = takeSubmittable();
    if (toSubmit === undefined) return;

    justSubmitted.current = true;
    onSubmit(question, toSubmit, checkAnswer(question, toSubmit));
  }

  return (
    // `data-question-number` is the per-Question anchor for e2e specs: the
    // Question's global 1-based number, stable across pagination and Page-size
    // re-chunking, unlike DOM order on the current page.
    <div className={styles.root} data-question-number={index + 1}>
      <div className={styles.number}>{index + 1}</div>
      <fieldset
        className={styles.fieldset}
        aria-describedby={isLocked ? `${idPrefix}-result` : undefined}
      >
        <MarkdownRender content={titleHtml} size="m" as="legend" className={styles.question} />
        {descriptionHtml !== undefined && (
          <MarkdownRender content={descriptionHtml} size="s" className={styles.description} />
        )}

        <AnswerControl
          question={question}
          answer={answer}
          disabled={isLocked}
          showAnswerFeedback={progress?.isCorrect === false}
          idPrefix={idPrefix}
          inputError={inputError}
          optionOrder={optionOrder}
          onDraftChange={setDraft}
          onSubmit={submit}
        />

        {!isLocked && (
          <Button
            type="button"
            onClick={submit}
            disabled={!submittable}
            className={styles.submitButton}
          >
            Submit
          </Button>
        )}
      </fieldset>

      {/*
        Deliberately a sibling of the fieldset, not a child. Locking the card
        uses `<fieldset disabled>`, which the HTML spec propagates to *every*
        descendant form control — that silently disabled the Explanation's
        read-aloud <button> too. Keeping the result outside the fieldset frees
        its controls while the answer inputs stay locked. `aria-describedby`
        still resolves: it links by id, regardless of DOM nesting.
      */}
      {progress !== undefined && (
        <QuestionResult
          ref={resultRef}
          question={question}
          isCorrect={progress.isCorrect}
          id={`${idPrefix}-result`}
        />
      )}
    </div>
  );
});
