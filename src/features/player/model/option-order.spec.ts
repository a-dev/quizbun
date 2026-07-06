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

describe("shuffleOptionIndexes", () => {
  test("returns a permutation of original Option indexes", () => {
    expect(shuffleOptionIndexes(4, () => 0)).toEqual([1, 2, 3, 0]);
  });
});

describe("createOptionOrderByQuestionId", () => {
  test("includes choice Questions only", () => {
    expect(createOptionOrderByQuestionId(quiz, () => 0)).toEqual({ single: [1, 2, 0] });
  });
});
