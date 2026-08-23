import { describe, expect, it, vi } from "vitest";
import { page } from "vitest/browser";

import type { Quiz } from "@/shared/lib/quiz";
import type { QuestionProgress } from "@/shared/lib/storage";

import { QuestionPreviewList } from "./question-preview-list";

const quiz: Quiz = {
  schemaVersion: 1,
  id: "preview-list",
  title: "Preview list",
  tags: [],
  questions: [
    {
      id: "q-one",
      type: "single-choice",
      title: "What is `0.1 + 0.2`?",
      explanation: "One.",
      options: [
        { text: "Right", isCorrect: true },
        { text: "Wrong", isCorrect: false },
      ],
    },
    {
      id: "q-two",
      type: "single-choice",
      title: "Second Question",
      explanation: "Two.",
      options: [
        { text: "Right", isCorrect: true },
        { text: "Wrong", isCorrect: false },
      ],
    },
    {
      id: "q-three",
      type: "input",
      title: "Third Question",
      explanation: "Three.",
      validation: { mode: "text", acceptedAnswers: ["answer"] },
    },
  ],
};

const answers: Record<string, QuestionProgress> = {
  "q-one": {
    contentHash: "one",
    submittedAnswer: 0,
    isCorrect: true,
  },
  "q-two": {
    contentHash: "two",
    submittedAnswer: 1,
    isCorrect: false,
  },
};

describe("QuestionPreviewList", () => {
  it("renders outcomes, accessible labels, Markdown titles, and crawlable hrefs", async () => {
    const screen = await page.render(
      <QuestionPreviewList
        quiz={quiz}
        answers={answers}
        questionHref={(questionId) => `?mode=run&question=${questionId}`}
        onQuestionSelect={() => undefined}
      />,
    );

    await expect.element(screen.getByRole("region", { name: "Questions" })).toBeInTheDocument();
    await expect.element(screen.getByText("Correct.", { exact: true })).toBeInTheDocument();
    await expect.element(screen.getByText("Incorrect.", { exact: true })).toBeInTheDocument();
    await expect.element(screen.getByText("Not answered.", { exact: true })).toBeInTheDocument();
    await expect.element(screen.getByText("0.1 + 0.2", { exact: true })).toBeInTheDocument();

    const firstQuestion = screen.getByRole("link", { name: "What is 0.1 + 0.2?" });
    expect(firstQuestion.element().getAttribute("href")).toBe("?mode=run&question=q-one");
    // The target is this same page under a query param: crawling it buys
    // nothing and the anchor text is already indexed here (PRD §5).
    expect(firstQuestion.element().getAttribute("rel")).toBe("nofollow");
  });

  it("intercepts only unmodified left clicks", async () => {
    const onQuestionSelect = vi.fn();
    const screen = await page.render(
      <QuestionPreviewList
        quiz={quiz}
        answers={undefined}
        questionHref={(questionId) => `?mode=run&question=${questionId}`}
        onQuestionSelect={onQuestionSelect}
      />,
    );

    await screen.getByRole("link", { name: "What is 0.1 + 0.2?" }).click();
    expect(onQuestionSelect).toHaveBeenCalledWith("q-one");

    onQuestionSelect.mockClear();

    const modifiedLink = screen.getByRole("link", { name: "Second Question" }).element();
    const preventNavigation = (event: MouseEvent) => event.preventDefault();
    document.body.addEventListener("click", preventNavigation, { once: true });

    modifiedLink.dispatchEvent(
      new MouseEvent("click", {
        bubbles: true,
        button: 0,
        cancelable: true,
        ctrlKey: true,
      }),
    );

    expect(onQuestionSelect).not.toHaveBeenCalled();
  });
});
