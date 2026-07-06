import { useState } from "react";

import { describe, expect, it, vi } from "vitest";
import { page } from "vitest/browser";

import type { MultipleChoiceQuestion, SingleChoiceQuestion } from "@/shared/lib/quiz";
import type { SubmittedAnswer } from "@/shared/lib/storage";
import checkboxStyles from "@/shared/ui/checkbox/checkbox.module.css";
import radioStyles from "@/shared/ui/radio/radio.module.css";

import { AnswerControl } from "./answer-control";

const singleChoiceQuestion: SingleChoiceQuestion = {
  id: "single",
  type: "single-choice",
  title: "Single",
  explanation: "Explanation.",
  options: [
    { text: "Original zero", isCorrect: true },
    { text: "Original one", isCorrect: false },
    { text: "Original two", isCorrect: false },
  ],
};

const multipleChoiceQuestion: MultipleChoiceQuestion = {
  ...singleChoiceQuestion,
  id: "multiple",
  type: "multiple-choice",
};

function MultipleChoiceHarness({
  onDraftChange,
}: {
  onDraftChange: (answer: SubmittedAnswer) => void;
}) {
  const [answer, setAnswer] = useState<SubmittedAnswer>();

  return (
    <AnswerControl
      question={multipleChoiceQuestion}
      answer={answer}
      disabled={false}
      idPrefix="multiple"
      inputError={undefined}
      optionOrder={[2, 0, 1]}
      onDraftChange={(draft) => {
        setAnswer(draft);
        onDraftChange(draft);
      }}
      onSubmit={() => undefined}
    />
  );
}

describe("AnswerControl", () => {
  it("renders a shuffled Option but submits its original index", async () => {
    const onDraftChange = vi.fn();
    const screen = await page.render(
      <AnswerControl
        question={singleChoiceQuestion}
        answer={undefined}
        disabled={false}
        idPrefix="single"
        inputError={undefined}
        optionOrder={[2, 0, 1]}
        onDraftChange={onDraftChange}
        onSubmit={() => undefined}
      />,
    );

    await screen.getByRole("radio", { name: "Original two" }).click();

    expect(onDraftChange).toHaveBeenCalledWith(2);
  });

  it("keeps multiple-choice submissions in original-index order", async () => {
    const onDraftChange = vi.fn();
    const screen = await page.render(<MultipleChoiceHarness onDraftChange={onDraftChange} />);

    await screen.getByRole("checkbox", { name: "Original two" }).click();
    await screen.getByRole("checkbox", { name: "Original zero" }).click();

    expect(onDraftChange).toHaveBeenLastCalledWith([0, 2]);
  });

  it("disables single-choice and multiple-choice controls", async () => {
    const singleChoiceScreen = await page.render(
      <AnswerControl
        question={singleChoiceQuestion}
        answer={undefined}
        disabled
        idPrefix="single"
        inputError={undefined}
        optionOrder={undefined}
        onDraftChange={() => undefined}
        onSubmit={() => undefined}
      />,
    );

    await expect(singleChoiceScreen.getByRole("radio", { name: "Original zero" })).toBeDisabled();

    const multipleChoiceScreen = await page.render(
      <AnswerControl
        question={multipleChoiceQuestion}
        answer={undefined}
        disabled
        idPrefix="multiple"
        inputError={undefined}
        optionOrder={undefined}
        onDraftChange={() => undefined}
        onSubmit={() => undefined}
      />,
    );

    await expect(
      multipleChoiceScreen.getByRole("checkbox", { name: "Original zero" }),
    ).toBeDisabled();
  });

  it("reveals correct Options and marks selected incorrect Options after a wrong submission", async () => {
    const singleChoiceScreen = await page.render(
      <AnswerControl
        question={singleChoiceQuestion}
        answer={1}
        disabled
        showAnswerFeedback
        idPrefix="single"
        inputError={undefined}
        optionOrder={undefined}
        onDraftChange={() => undefined}
        onSubmit={() => undefined}
      />,
    );

    const correctRadio = singleChoiceScreen.getByRole("radio", { name: /Original zero/i });
    const incorrectRadio = singleChoiceScreen.getByRole("radio", { name: /Original one/i });

    await expect.element(correctRadio).toHaveAccessibleName(/Correct Option/i);
    await expect.element(incorrectRadio).toHaveAccessibleName(/Your selection is incorrect/i);
    expect(correctRadio.element().classList.contains(radioStyles.controlFeedbackCorrect)).toBe(
      true,
    );
    expect(incorrectRadio.element().classList.contains(radioStyles.controlFeedbackIncorrect)).toBe(
      true,
    );

    const multipleChoiceScreen = await page.render(
      <AnswerControl
        question={multipleChoiceQuestion}
        answer={[1]}
        disabled
        showAnswerFeedback
        idPrefix="multiple"
        inputError={undefined}
        optionOrder={undefined}
        onDraftChange={() => undefined}
        onSubmit={() => undefined}
      />,
    );

    const correctCheckbox = multipleChoiceScreen.getByRole("checkbox", { name: /Original zero/i });
    const incorrectCheckbox = multipleChoiceScreen.getByRole("checkbox", { name: /Original one/i });

    await expect.element(correctCheckbox).toHaveAccessibleName(/Correct Option/i);
    await expect.element(incorrectCheckbox).toHaveAccessibleName(/Your selection is incorrect/i);
    expect(
      correctCheckbox.element().classList.contains(checkboxStyles.controlFeedbackCorrect),
    ).toBe(true);
    expect(
      incorrectCheckbox.element().classList.contains(checkboxStyles.controlFeedbackIncorrect),
    ).toBe(true);
  });
});
