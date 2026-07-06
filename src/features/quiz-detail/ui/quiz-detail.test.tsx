import { describe, expect, it } from "vitest";
import { page } from "vitest/browser";

import type { Quiz } from "@/shared/lib/quiz";
import { saveAnswer, type QuestionProgress } from "@/shared/lib/storage";

import { QuizDetail } from "./quiz-detail";

function makeQuiz(id: string): Quiz {
  return {
    schemaVersion: 1,
    id,
    title: "Sample quiz",
    tags: ["sample"],
    questions: [
      {
        id: "q-one",
        type: "single-choice",
        title: "One",
        explanation: "Explanation for one.",
        options: [
          { text: "Right", isCorrect: true },
          { text: "Wrong", isCorrect: false },
        ],
      },
      {
        id: "q-two",
        type: "single-choice",
        title: "Two",
        explanation: "Explanation for two.",
        options: [
          { text: "Right", isCorrect: true },
          { text: "Wrong", isCorrect: false },
        ],
      },
    ],
  };
}

function progress(): QuestionProgress {
  return {
    contentHash: "test-content-hash",
    submittedAnswer: 0,
    isCorrect: true,
  };
}

async function renderDetail(quiz: Quiz) {
  return page.render(
    <QuizDetail
      quiz={quiz}
      source="library"
      backHref="/library/"
      backLabel="Library"
      renderPlayer={({ urlView }) => <div>{urlView}</div>}
    />,
  );
}

describe("QuizDetail", () => {
  it("offers Start before a Run exists", async () => {
    const screen = await renderDetail(makeQuiz("detail-start"));

    await expect.element(screen.getByRole("button", { name: "Start" })).toBeInTheDocument();
    await expect.element(screen.getByText("1 of 2 answered")).not.toBeInTheDocument();
    await expect
      .element(screen.getByRole("button", { name: "Reset progress" }))
      .not.toBeInTheDocument();
  });

  it("shows in-progress count in the header and Continue action", async () => {
    const quiz = makeQuiz("detail-continue");
    await saveAnswer("library", quiz, "q-one", progress());

    const screen = await renderDetail(quiz);

    await expect.element(screen.getByText(/^1 of 2 answered$/)).toBeInTheDocument();
    await expect.element(screen.getByRole("button", { name: "Continue" })).toBeInTheDocument();
    await expect
      .element(screen.getByRole("button", { name: "Reset progress" }))
      .toBeInTheDocument();
  });

  it("offers summary and retake after the Run is finished", async () => {
    const quiz = makeQuiz("detail-summary");
    await saveAnswer("library", quiz, "q-one", progress());
    await saveAnswer("library", quiz, "q-two", progress());

    const screen = await renderDetail(quiz);

    await expect.element(screen.getByText(/^2 of 2 answered$/)).toBeInTheDocument();
    await expect.element(screen.getByRole("button", { name: "See summary" })).toBeInTheDocument();
    await expect.element(screen.getByRole("button", { name: "Retake" })).toBeInTheDocument();
    await expect
      .element(screen.getByRole("button", { name: "Reset progress" }))
      .toBeInTheDocument();
  });
});
