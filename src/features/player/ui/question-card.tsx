import { memo, useCallback, useId, useMemo, useRef, useState } from "react";

import { checkAnswer } from "@/shared/lib/quiz";
import type { Question } from "@/shared/lib/quiz";
import { renderMarkdownField } from "@/shared/lib/render";
import { questionAnchorId } from "@/shared/lib/routing";
import type { QuestionProgress, SubmittedAnswer } from "@/shared/lib/storage";
import { Button } from "@/shared/ui/button";
import { MarkdownRender } from "@/shared/ui/markdown";

import { useAnswerDraft } from "../model/use-answer-draft";
import { AnswerControl } from "./answer-control";
import { AnswerHint } from "./answer-hint";
import { QuestionMedia } from "./question-media";
import { QuestionResult } from "./question-result";

import styles from "./question-card.module.css";

interface Props {
  quizId: string;
  question: Question;
  index: number;
  progress: QuestionProgress | undefined;
  optionOrder: readonly number[] | undefined;
  mediaPriority?: boolean;
  onSubmit: (question: Question, answer: SubmittedAnswer, isCorrect: boolean) => void;
}

/**
 * One Question, with its draft, lock/result state, and Explanation. Wrapped in
 * `memo` because the parent re-chunks (new page objects) on every submit;
 * without it, submitting one Question re-renders every other card on the page.
 */
export const QuestionCard = memo(function QuestionCard({
  quizId,
  question,
  index,
  progress,
  optionOrder,
  mediaPriority = false,
  onSubmit,
}: Props) {
  const idPrefix = useId();
  const { answer, isLocked, submittable, inputError, setDraft, takeSubmittable } = useAnswerDraft(
    question,
    progress,
  );

  // Drives the one-shot wave across the dotted rule. State, not `progress`:
  // `progress` is also set for a Question answered in an earlier session, and
  // that must not replay the wave on page load or on re-pagination.
  const [hasJustSubmitted, setHasJustSubmitted] = useState(false);

  // Bridges the submit action to the later locked render: focus the result only
  // when the user just produced it, not when reviewing an already-answered Run.
  const justSubmitted = useRef(false);

  // The Submit button unmounts when the card locks; without this, keyboard
  // focus falls back to <body>. Move it to the result the user just produced.
  // The result element mounts exactly when the card locks, so its ref callback
  // is that moment — no effect needed. Stable identity keeps React from
  // detaching and re-attaching the ref on every later render.
  // `preventScroll`: the result appears right where the user is already looking,
  // so the default focus scroll would only yank the card's top off-screen.
  const focusJustProducedResult = useCallback((node: HTMLDivElement | null) => {
    if (node !== null && justSubmitted.current) {
      justSubmitted.current = false;
      node.focus({ preventScroll: true });
    }
  }, []);

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

  function submit() {
    const toSubmit = takeSubmittable();
    if (toSubmit === undefined) return;

    justSubmitted.current = true;
    setHasJustSubmitted(true);
    onSubmit(question, toSubmit, checkAnswer(question, toSubmit));
  }

  return (
    // `id` is the URL fragment target. `data-question-number` gives e2e specs
    // the Question's global 1-based number, stable across pagination and
    // Page-size re-chunking, unlike DOM order on the current page.
    <div
      id={questionAnchorId(question.id)}
      className={styles.root}
      data-question-number={index + 1}
    >
      <div className={styles.number}>{index + 1}</div>
      <fieldset
        className={styles.fieldset}
        aria-describedby={isLocked ? `${idPrefix}-result` : undefined}
      >
        <MarkdownRender content={titleHtml} size="m" as="legend" className={styles.question} />
        <QuestionMedia
          quizId={quizId}
          questionTitle={question.title}
          images={question.images}
          videos={question.videos}
          surface="question"
          priority={mediaPriority}
        />
        {descriptionHtml !== undefined && (
          <MarkdownRender content={descriptionHtml} size="s" className={styles.description} />
        )}

        <section className={styles.answers} data-just-submitted={hasJustSubmitted || undefined}>
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
        </section>

        {!isLocked && (
          <footer className={styles.footer}>
            <Button
              type="button"
              onClick={submit}
              disabled={!submittable}
              className={styles.submitButton}
            >
              Submit
            </Button>
            {question.type === "single-choice" && (
              <AnswerHint type="single-choice" id={`${idPrefix}-answer-hint`} />
            )}
            {question.type === "multiple-choice" && (
              <AnswerHint type="multiple-choice" id={`${idPrefix}-answer-hint`} />
            )}
          </footer>
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
          ref={focusJustProducedResult}
          quizId={quizId}
          question={question}
          isCorrect={progress.isCorrect}
          id={`${idPrefix}-result`}
        />
      )}
    </div>
  );
});
