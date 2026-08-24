import type { QuestionProgress } from "@/shared/lib/storage";

export type QuestionOutcome = "correct" | "incorrect" | "unanswered";

/** Derives the detail-list outcome without exposing stored answer contents. */
export function questionOutcome(
  answers: Readonly<Record<string, QuestionProgress>> | undefined,
  questionId: string,
): QuestionOutcome {
  const progress = answers?.[questionId];

  if (progress === undefined) return "unanswered";

  return progress.isCorrect ? "correct" : "incorrect";
}
