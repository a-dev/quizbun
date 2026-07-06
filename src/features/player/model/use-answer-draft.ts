import { useState } from "react";

import type { Question } from "@/shared/lib/quiz";
import type { QuestionProgress, SubmittedAnswer } from "@/shared/lib/storage";

import { draftIsSubmittable, numericInputError } from "./answer";

export interface AnswerDraft {
  /** The value shown by the controls: the locked submission, or the live draft. */
  answer: SubmittedAnswer | undefined;
  /** True once the Question is submitted; the card then renders read-only. */
  isLocked: boolean;
  /** Whether Submit should be enabled. */
  submittable: boolean;
  /** Inline numeric-parse hint, or undefined when there's nothing to flag. */
  inputError: string | undefined;
  setDraft: (draft: SubmittedAnswer) => void;
  /** The draft to submit, or undefined if not submittable. */
  takeSubmittable: () => SubmittedAnswer | undefined;
}

/**
 * Owns the in-progress answer for a single Question card. Once `progress`
 * exists the Question is locked, so the draft is ignored and the controls
 * display the original submission.
 */
export function useAnswerDraft(
  question: Question,
  progress: QuestionProgress | undefined,
): AnswerDraft {
  const [draft, setDraft] = useState<SubmittedAnswer | undefined>(undefined);

  const isLocked = progress !== undefined;
  const submittable = draftIsSubmittable(question, draft);

  return {
    answer: isLocked ? progress.submittedAnswer : draft,
    isLocked,
    submittable,
    inputError: isLocked ? undefined : numericInputError(question, draft),
    setDraft,
    takeSubmittable: () => (submittable ? draft : undefined),
  };
}
