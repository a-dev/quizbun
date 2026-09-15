import { useMemo } from "react";

import type { Question } from "@/shared/lib/quiz";
import { renderMarkdownField } from "@/shared/lib/render";
import type { SubmittedAnswer } from "@/shared/lib/storage";
import type { AnswerFeedback } from "@/shared/ui/answer-feedback";
import { Checkbox, CheckboxGroup } from "@/shared/ui/checkbox";
import { InputField } from "@/shared/ui/input";
import { MarkdownRender } from "@/shared/ui/markdown";
import { Radio, RadioGroup } from "@/shared/ui/radio";

interface AnswerControlProps {
  question: Question;
  /** The locked submission, or the live draft. */
  answer: SubmittedAnswer | undefined;
  /** Prevent editing a submitted answer and reflect that state in every control. */
  disabled: boolean;
  /** Reveal correct Options and incorrect selections after an incorrect submission. */
  showAnswerFeedback?: boolean;
  /** Unique prefix for control names/ids (shared with the card's result). */
  idPrefix: string;
  /** Inline numeric-parse hint for `input` Questions. */
  inputError: string | undefined;
  /** Display-only order of original JSON Option indexes. */
  optionOrder: readonly number[] | undefined;
  onDraftChange: (draft: SubmittedAnswer) => void;
  /** Submit-on-Enter for the single-field `input` type. */
  onSubmit: () => void;
}

/**
 * Post-submit marking for one Option. Every correct Option is marked correct;
 * a wrong one is marked only when the Learner actually picked it.
 */
function optionFeedback(
  show: boolean,
  isCorrect: boolean,
  isSelected: boolean,
): AnswerFeedback | undefined {
  if (!show) return undefined;
  if (isCorrect) return "correct";

  return isSelected ? "incorrect" : undefined;
}

/**
 * Renders the answer widget for a Question's `type`. Option identity is the
 * original JSON order (the Standard carries no option ids). `optionOrder`
 * changes only visual order; each control still submits its original index.
 *
 * Each Option group points at the card's `AnswerHint` with `aria-describedby`.
 * The hint itself is rendered by `QuestionCard` (in the footer, next to
 * Submit); `aria-describedby` links by id, so DOM nesting doesn't matter.
 * Assistive tech already distinguishes the two groups by role, so the hint is
 * a *description* rather than the group's label: it adds the exact-set rule
 * without displacing the accessible name.
 */
export function AnswerControl({
  question,
  answer,
  disabled,
  showAnswerFeedback = false,
  idPrefix,
  inputError,
  optionOrder,
  onDraftChange,
  onSubmit,
}: Readonly<AnswerControlProps>) {
  // Markdown rendering (marked + sanitize-html) is comparatively costly; the
  // option text never changes for a given Question, so render it once.
  const optionsHtml = useMemo(
    () =>
      question.type === "input"
        ? []
        : question.options.map((option) => renderMarkdownField("optionText", option.text)),
    [question],
  );
  const displayedOptionIndexes = optionOrder ?? optionsHtml.map((_, optionIndex) => optionIndex);

  const hintId = `${idPrefix}-answer-hint`;

  switch (question.type) {
    case "single-choice":
      return (
        <RadioGroup
          aria-describedby={hintId}
          disabled={disabled}
          name={`${idPrefix}-options`}
          value={typeof answer === "number" ? answer : null}
          onValueChange={(value) => onDraftChange(value as number)}
        >
          {displayedOptionIndexes.map((optionIndex) => (
            <Radio
              key={optionIndex}
              value={optionIndex}
              feedback={optionFeedback(
                showAnswerFeedback,
                question.options[optionIndex]!.isCorrect,
                answer === optionIndex,
              )}
            >
              <MarkdownRender as="span" content={optionsHtml[optionIndex]!} size="m" />
            </Radio>
          ))}
        </RadioGroup>
      );

    case "multiple-choice":
      return (
        <CheckboxGroup
          aria-describedby={hintId}
          disabled={disabled}
          value={Array.isArray(answer) ? answer.map(String) : []}
          onValueChange={(values) => onDraftChange(values.map(Number).sort((a, b) => a - b))}
        >
          {displayedOptionIndexes.map((optionIndex) => (
            <Checkbox
              key={optionIndex}
              value={String(optionIndex)}
              feedback={optionFeedback(
                showAnswerFeedback,
                question.options[optionIndex]!.isCorrect,
                Array.isArray(answer) && answer.includes(optionIndex),
              )}
            >
              <MarkdownRender as="span" content={optionsHtml[optionIndex]!} size="m" />
            </Checkbox>
          ))}
        </CheckboxGroup>
      );

    case "input":
      return (
        <InputField
          label="Your answer"
          type="text"
          inputMode={question.validation.mode === "numeric" ? "decimal" : "text"}
          error={inputError}
          disabled={disabled}
          value={typeof answer === "string" ? answer : ""}
          onChange={(event) => onDraftChange(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter") {
              event.preventDefault();
              onSubmit();
            }
          }}
        />
      );
  }
}
