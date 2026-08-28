import { describe, expect, it, vi } from "vitest";
import { page, userEvent } from "vitest/browser";

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
        questionHref={(questionId) => `?mode=run&question=${questionId}#question-${questionId}`}
        onQuestionSelect={() => undefined}
      />,
    );

    await expect.element(screen.getByRole("region", { name: "Questions" })).toBeInTheDocument();
    await expect.element(screen.getByText("Correct.", { exact: true })).toBeInTheDocument();
    await expect.element(screen.getByText("Incorrect.", { exact: true })).toBeInTheDocument();
    await expect.element(screen.getByText("Not answered.", { exact: true })).toBeInTheDocument();
    await expect.element(screen.getByText("0.1 + 0.2", { exact: true })).toBeInTheDocument();

    const firstQuestion = screen.getByRole("link", { name: "What is 0.1 + 0.2?" });
    expect(firstQuestion.element().getAttribute("href")).toBe(
      "?mode=run&question=q-one#question-q-one",
    );
    // The target is this same page under a query param: crawling it buys
    // nothing and the anchor text is already indexed here (SPEC.md §4).
    expect(firstQuestion.element().getAttribute("rel")).toBe("nofollow");
  });

  it("intercepts only unmodified left clicks", async () => {
    const onQuestionSelect = vi.fn();
    const screen = await page.render(
      <QuestionPreviewList
        quiz={quiz}
        answers={undefined}
        questionHref={(questionId) => `?mode=run&question=${questionId}#question-${questionId}`}
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

  // `content-visibility: auto` on the off-screen items skips their rendering,
  // and the guidance for it requires proving sequential keyboard reachability
  // across that boundary: every item holds a link, and SPEC §7 promises full
  // keyboard operation.
  it("keeps deferred off-screen items sequentially focusable", async () => {
    const longQuiz: Quiz = {
      ...quiz,
      questions: Array.from({ length: 12 }, (_, index) => ({
        id: `q-${index}`,
        type: "input",
        title: `Question ${index}`,
        explanation: "Explanation.",
        validation: { mode: "text", acceptedAnswers: ["answer"] },
      })),
    };

    const screen = await page.render(
      <QuestionPreviewList
        quiz={longQuiz}
        answers={undefined}
        questionHref={(questionId) => `/quizzes/preview-list/?question=${questionId}`}
        onQuestionSelect={vi.fn()}
      />,
    );

    const items = [...screen.container.querySelectorAll("li")];

    // The rule starts at the fifth item; anything before it must stay rendered.
    expect(getComputedStyle(items[3]!).contentVisibility).toBe("visible");
    expect(getComputedStyle(items[4]!).contentVisibility).toBe("auto");

    const lastRenderedLink = screen.getByRole("link", { name: "Question 3" }).element();
    (lastRenderedLink as HTMLAnchorElement).focus();

    await userEvent.tab();
    expect(document.activeElement).toBe(screen.getByRole("link", { name: "Question 4" }).element());

    await userEvent.tab();
    expect(document.activeElement).toBe(screen.getByRole("link", { name: "Question 5" }).element());
  });
});
