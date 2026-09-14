import { describe, expect, test } from "vitest";

import type { Quiz } from "@/shared/lib/quiz";

import { createOptionOrderByQuestionId, shuffleOptionIndexes } from "./option-order";

const quiz: Quiz = {
  schemaVersion: 1,
  id: "option-order",
  title: "Option order",
  tags: [],
  questions: [
    {
      id: "single",
      type: "single-choice",
      title: "Single",
      explanation: "Explanation.",
      options: [
        { text: "Zero", isCorrect: true },
        { text: "One", isCorrect: false },
        { text: "Two", isCorrect: false },
      ],
    },
    {
      id: "input",
      type: "input",
      title: "Input",
      explanation: "Explanation.",
      validation: { mode: "text", acceptedAnswers: ["answer"] },
    },
  ],
};

/**
 * A `random` that walks a fixed sequence. A constant stub would leave the
 * Fisher-Yates arithmetic unobservable: `floor(0 * n)` is 0 for every `n`, so
 * the swap index never depends on the loop counter.
 */
function sequence(values: readonly number[]): () => number {
  let index = 0;

  return () => values[index++ % values.length]!;
}

describe("shuffleOptionIndexes", () => {
  test("returns a permutation of original Option indexes", () => {
    expect(shuffleOptionIndexes(4, () => 0)).toEqual([1, 2, 3, 0]);
  });

  test("draws the swap index from the shrinking unshuffled range", () => {
    // Fisher-Yates over [0,1,2,3]: floor(0.2*4)=0 swaps 3↔0, floor(0.5*3)=1
    // swaps 2↔1, floor(0.4*2)=0 swaps 1↔0. Every draw is scaled by the current
    // loop counter, so the result pins the `random() * (index + 1)` arithmetic.
    expect(shuffleOptionIndexes(4, sequence([0.2, 0.5, 0.4]))).toEqual([2, 3, 1, 0]);
  });

  test("returns every index exactly once for an arbitrary draw sequence", () => {
    const shuffled = shuffleOptionIndexes(6, sequence([0.73, 0.11, 0.42, 0.98, 0.35]));

    expect([...shuffled].sort((a, b) => a - b)).toEqual([0, 1, 2, 3, 4, 5]);
  });

  test("handles Option counts that need no swapping", () => {
    expect(shuffleOptionIndexes(0, sequence([0.5]))).toEqual([]);
    expect(shuffleOptionIndexes(1, sequence([0.5]))).toEqual([0]);
  });
});

describe("createOptionOrderByQuestionId", () => {
  test("includes choice Questions only", () => {
    expect(createOptionOrderByQuestionId(quiz, () => 0)).toEqual({ single: [1, 2, 0] });
  });
});
