import { useMemo } from "react";

import type { Question } from "@/shared/lib/quiz";
import { renderMarkdownField } from "@/shared/lib/render";
import type { SubmittedAnswer } from "@/shared/lib/storage";
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
 * Renders the answer widget for a Question's `type`. Option identity is the
 * original JSON order (the Standard carries no option ids). `optionOrder`
 * changes only visual order; each control still submits its original index.
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
}: AnswerControlProps) {
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

  switch (question.type) {
    case "single-choice":
      return (
        <RadioGroup
          disabled={disabled}
          name={`${idPrefix}-options`}
          value={typeof answer === "number" ? answer : undefined}
          onValueChange={(value) => onDraftChange(value as number)}
        >
          {displayedOptionIndexes.map((optionIndex) => (
            <Radio
              key={optionIndex}
              value={optionIndex}
              feedback={
                showAnswerFeedback
                  ? question.options[optionIndex]!.isCorrect
                    ? "correct"
                    : answer === optionIndex
                      ? "incorrect"
                      : undefined
                  : undefined
              }
            >
              <MarkdownRender as="span" content={optionsHtml[optionIndex]!} size="m" />
            </Radio>
          ))}
        </RadioGroup>
      );

    case "multiple-choice":
      return (
        <CheckboxGroup
          disabled={disabled}
          value={Array.isArray(answer) ? answer.map(String) : []}
          onValueChange={(values) => onDraftChange(values.map(Number).sort((a, b) => a - b))}
        >
          {displayedOptionIndexes.map((optionIndex) => (
            <Checkbox
              key={optionIndex}
              value={String(optionIndex)}
              feedback={
                showAnswerFeedback
                  ? question.options[optionIndex]!.isCorrect
                    ? "correct"
                    : Array.isArray(answer) && answer.includes(optionIndex)
                      ? "incorrect"
                      : undefined
                  : undefined
              }
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
