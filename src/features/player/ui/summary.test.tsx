import { describe, expect, it, vi } from "vitest";
import { page } from "vitest/browser";

import type { Quiz } from "@/shared/lib/quiz";

import type { Answers } from "../model/run-engine";
import { Summary } from "./summary";

const quiz: Quiz = {
  schemaVersion: 1,
  id: "js-basics",
  title: "JS Basics",
  tags: ["test"],
  questions: [
    {
      id: "falsy",
      type: "single-choice",
      title: "Which JavaScript value is falsy?",
      explanation: "`0` is falsy.",
      options: [
        { text: "`0`", isCorrect: true },
        { text: "`[]`", isCorrect: false },
      ],
    },
    {
      id: "typeof-null",
      type: "single-choice",
      title: "What does `typeof null` return?",
      explanation: 'It returns `"object"`.',
      options: [
        { text: '`"object"`', isCorrect: true },
        { text: '`"null"`', isCorrect: false },
      ],
    },
  ],
};

const answers: Answers = {
  falsy: { contentHash: "h1", submittedAnswer: 0, isCorrect: true },
  "typeof-null": { contentHash: "h2", submittedAnswer: 1, isCorrect: false },
};

async function renderSummary(overrides: Partial<Parameters<typeof Summary>[0]> = {}) {
  const onReviewQuestion = vi.fn();
  const screen = await page.render(
    <Summary
      quiz={quiz}
      answers={answers}
      onReviewQuestion={onReviewQuestion}
      onRetake={vi.fn()}
      onBack={vi.fn()}
      {...overrides}
    />,
  );
  return { screen, onReviewQuestion };
}

describe("Summary", () => {
  it("invokes onReviewQuestion with the Question id when its Review button is clicked", async () => {
    const { screen, onReviewQuestion } = await renderSummary();

    // The first list item's Review button must be the real click target — a CSS
    // overlay (e.g. a sibling spanning the grid cell) would make this fail.
    await screen.getByRole("button", { name: "Review" }).first().click();

    expect(onReviewQuestion).toHaveBeenCalledExactlyOnceWith("falsy");
  });
});
