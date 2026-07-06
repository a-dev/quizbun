import { parseNumericInput } from "@/shared/lib/quiz";
import type { Question } from "@/shared/lib/quiz";
import type { SubmittedAnswer } from "@/shared/lib/storage";

/**
 * Answer-draft rules (T6.x): pure predicates over a Question and the user's
 * in-progress draft. Kept React-free so the card stays a thin renderer and the
 * rules can be unit-tested directly.
 */

/** Whether the current draft is complete enough to submit for this Question. */
export function draftIsSubmittable(
  question: Question,
  draft: SubmittedAnswer | undefined,
): boolean {
  if (draft === undefined) return false;

  switch (question.type) {
    case "single-choice":
      return typeof draft === "number";
    case "multiple-choice":
      // Micro-decision 2: an empty selection carries no learning signal.
      return Array.isArray(draft) && draft.length > 0;
    case "input": {
      if (typeof draft !== "string" || draft.trim() === "") return false;

      return question.validation.mode === "text" || parseNumericInput(draft) !== undefined;
    }
  }
}

/**
 * Inline error for a numeric input Question whose draft can't parse as a
 * number. A numeric Question silently disabling Submit gives no clue why, so we
 * surface the type mismatch once the user has typed something unparseable.
 * Returns undefined when there's nothing to flag (other types, empty, valid).
 */
export function numericInputError(
  question: Question,
  draft: SubmittedAnswer | undefined,
): string | undefined {
  if (question.type !== "input" || question.validation.mode !== "numeric") return undefined;
  if (typeof draft !== "string" || draft.trim() === "") return undefined;

  return parseNumericInput(draft) === undefined
    ? "Enter a number, for example 42 or 3.14."
    : undefined;
}
