import type { Quiz } from "@/shared/lib/quiz";

/** Display-only mapping from a Question id to original JSON Option indexes. */
export type OptionOrderByQuestionId = Record<string, readonly number[]>;

/**
 * Returns a random ordering of original Option indexes. The indexes, rather
 * than Option objects, make it impossible for the renderer to change the
 * Quiz's content order or the answer values saved for a Run.
 */
export function shuffleOptionIndexes(
  optionCount: number,
  random: () => number = Math.random,
): number[] {
  const indexes = Array.from({ length: optionCount }, (_, index) => index);

  for (let index = indexes.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(random() * (index + 1));
    [indexes[index], indexes[swapIndex]] = [indexes[swapIndex]!, indexes[index]!];
  }

  return indexes;
}

/**
 * Creates an in-memory display order for one player load. This deliberately
 * does not belong to the Quiz object or the saved Run.
 */
export function createOptionOrderByQuestionId(
  quiz: Quiz,
  random: () => number = Math.random,
): OptionOrderByQuestionId {
  return Object.fromEntries(
    quiz.questions.flatMap((question) =>
      question.type === "input"
        ? []
        : [[question.id, shuffleOptionIndexes(question.options.length, random)]],
    ),
  );
}
