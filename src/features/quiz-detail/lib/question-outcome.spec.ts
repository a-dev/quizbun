import { describe, expect, it } from "vitest";

import type { QuestionProgress } from "@/shared/lib/storage";

import { questionOutcome } from "./question-outcome";

const correct: QuestionProgress = {
  contentHash: "correct-hash",
  submittedAnswer: 0,
  isCorrect: true,
};

const incorrect: QuestionProgress = {
  contentHash: "incorrect-hash",
  submittedAnswer: 1,
  isCorrect: false,
};

describe("questionOutcome", () => {
  it("treats missing answers as unanswered during SSR and initial hydration", () => {
    expect(questionOutcome(undefined, "q-one")).toBe("unanswered");
  });

  it("treats a Question absent from loaded answers as unanswered", () => {
    expect(questionOutcome({ "q-two": correct }, "q-one")).toBe("unanswered");
  });

  it("derives correct and incorrect outcomes from saved Progress", () => {
    expect(questionOutcome({ "q-one": correct }, "q-one")).toBe("correct");
    expect(questionOutcome({ "q-one": incorrect }, "q-one")).toBe("incorrect");
  });
});
