import { describe, expect, it } from "vitest";
import { page } from "vitest/browser";

import type { SingleChoiceQuestion } from "@/shared/lib/quiz";

import { QuestionResult } from "./question-result";

const question: SingleChoiceQuestion = {
  id: "falsy-zero",
  type: "single-choice",
  title: "Which JavaScript value is falsy?",
  explanation: "`0` is falsy.",
  references:
    "Read the [MDN falsy glossary](https://developer.mozilla.org/en-US/docs/Glossary/Falsy).",
  options: [
    { text: "`0`", isCorrect: true },
    { text: "`[]`", isCorrect: false },
  ],
};

describe("QuestionResult", () => {
  it("renders References as a separate block after the Explanation", async () => {
    const screen = await page.render(<QuestionResult question={question} isCorrect id="result" />);

    await expect.element(screen.getByText("0 is falsy.")).toBeInTheDocument();
    await expect.element(screen.getByRole("heading", { name: "References" })).toBeInTheDocument();
    await expect
      .element(screen.getByRole("link", { name: "MDN falsy glossary" }))
      .toBeInTheDocument();
  });

  it("omits the References block when the Question has none", async () => {
    const screen = await page.render(
      <QuestionResult question={{ ...question, references: undefined }} isCorrect id="result" />,
    );

    await expect
      .element(screen.getByRole("heading", { name: "References" }))
      .not.toBeInTheDocument();
  });
});
