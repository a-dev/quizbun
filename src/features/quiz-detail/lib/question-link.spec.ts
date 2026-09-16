import { describe, expect, test } from "vitest";

import type { Quiz } from "@/shared/lib/quiz";

import { questionLinkNeedsAnchor } from "./question-link";

const quiz = {
  questions: Array.from({ length: 12 }, (_, index) => ({ id: `q-${index + 1}` })),
} as Quiz;

describe("questionLinkNeedsAnchor", () => {
  test.each([
    [1, "q-1", false],
    [1, "q-2", false],
    [3, "q-1", false],
    [3, "q-4", false],
    [3, "q-5", true],
    [5, "q-6", false],
    [5, "q-12", true],
    [10, "q-11", false],
  ] as const)("with page size %i, %s needs an anchor: %s", (pageSize, questionId, expected) => {
    expect(questionLinkNeedsAnchor(quiz, questionId, pageSize)).toBe(expected);
  });

  test("does not anchor an unknown Question", () => {
    expect(questionLinkNeedsAnchor(quiz, "missing", 5)).toBe(false);
  });
});
