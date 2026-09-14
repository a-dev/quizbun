import { describe, expect, test } from "vitest";

import type {
  InputQuestion,
  MultipleChoiceQuestion,
  Question,
  SingleChoiceQuestion,
} from "@/shared/lib/quiz";

import { draftIsSubmittable, numericInputError } from "./answer";

const singleChoice: SingleChoiceQuestion = {
  id: "sc",
  title: "Pick one",
  explanation: "Because.",
  type: "single-choice",
  options: [
    { text: "Wrong", isCorrect: false },
    { text: "Right", isCorrect: true },
  ],
};

const multipleChoice: MultipleChoiceQuestion = {
  id: "mc",
  title: "Pick all",
  explanation: "Because.",
  type: "multiple-choice",
  options: [
    { text: "Yes", isCorrect: true },
    { text: "No", isCorrect: false },
  ],
};

function inputQuestion(validation: InputQuestion["validation"]): InputQuestion {
  return { id: "in", title: "Type it", explanation: "Because.", type: "input", validation };
}

const textInput = inputQuestion({ mode: "text", acceptedAnswers: ["answer"] });
const numericInput = inputQuestion({ mode: "numeric", acceptedAnswers: [42] });

describe("draftIsSubmittable: no draft", () => {
  test("an untouched Question of any type is not submittable", () => {
    const questions: Question[] = [singleChoice, multipleChoice, textInput, numericInput];

    for (const question of questions) {
      expect(draftIsSubmittable(question, undefined)).toBe(false);
    }
  });
});

describe("draftIsSubmittable: single-choice", () => {
  test("any selected Option index is submittable, including index 0", () => {
    expect(draftIsSubmittable(singleChoice, 0)).toBe(true);
    expect(draftIsSubmittable(singleChoice, 1)).toBe(true);
  });

  test("a draft of the wrong shape is not submittable", () => {
    expect(draftIsSubmittable(singleChoice, [0])).toBe(false);
    expect(draftIsSubmittable(singleChoice, "0")).toBe(false);
  });
});

describe("draftIsSubmittable: multiple-choice", () => {
  test("a non-empty selection is submittable", () => {
    expect(draftIsSubmittable(multipleChoice, [0])).toBe(true);
    expect(draftIsSubmittable(multipleChoice, [0, 1])).toBe(true);
  });

  test("an empty selection is not submittable (it carries no learning signal)", () => {
    expect(draftIsSubmittable(multipleChoice, [])).toBe(false);
  });

  test("a draft of the wrong shape is not submittable", () => {
    expect(draftIsSubmittable(multipleChoice, 0)).toBe(false);
    expect(draftIsSubmittable(multipleChoice, "0")).toBe(false);
  });
});

describe("draftIsSubmittable: text input", () => {
  test("any non-blank string is submittable, however unlike the accepted answers", () => {
    expect(draftIsSubmittable(textInput, "answer")).toBe(true);
    expect(draftIsSubmittable(textInput, "nowhere near it")).toBe(true);
  });

  test("an empty or whitespace-only draft is not submittable", () => {
    expect(draftIsSubmittable(textInput, "")).toBe(false);
    expect(draftIsSubmittable(textInput, "   \t ")).toBe(false);
  });

  test("a draft of the wrong shape is not submittable", () => {
    expect(draftIsSubmittable(textInput, 0)).toBe(false);
    expect(draftIsSubmittable(textInput, [0])).toBe(false);
  });
});

describe("draftIsSubmittable: numeric input", () => {
  test("a parseable number is submittable, in either decimal notation", () => {
    expect(draftIsSubmittable(numericInput, "42")).toBe(true);
    expect(draftIsSubmittable(numericInput, " 3,14 ")).toBe(true);
  });

  test("an unparseable draft is not submittable", () => {
    // The gate that separates numeric from text: the same draft submits fine
    // against a text Question.
    expect(draftIsSubmittable(numericInput, "forty-two")).toBe(false);
    expect(draftIsSubmittable(textInput, "forty-two")).toBe(true);
  });

  test("an empty or whitespace-only draft is not submittable", () => {
    expect(draftIsSubmittable(numericInput, "")).toBe(false);
    expect(draftIsSubmittable(numericInput, "  ")).toBe(false);
  });
});

describe("numericInputError", () => {
  test("flags an unparseable draft on a numeric Question", () => {
    expect(numericInputError(numericInput, "forty-two")).toBe(
      "Enter a number, for example 42 or 3.14.",
    );
  });

  test("stays silent for a parseable draft", () => {
    expect(numericInputError(numericInput, "42")).toBeUndefined();
    expect(numericInputError(numericInput, "3,14")).toBeUndefined();
  });

  test("stays silent before the user has typed anything", () => {
    expect(numericInputError(numericInput, undefined)).toBeUndefined();
    expect(numericInputError(numericInput, "")).toBeUndefined();
    expect(numericInputError(numericInput, "   ")).toBeUndefined();
  });

  test("stays silent for a text input Question and for choice Questions", () => {
    expect(numericInputError(textInput, "forty-two")).toBeUndefined();
    expect(numericInputError(singleChoice, 0)).toBeUndefined();
    expect(numericInputError(multipleChoice, [0])).toBeUndefined();
  });

  test("stays silent for a draft of the wrong shape on a numeric Question", () => {
    expect(numericInputError(numericInput, 42)).toBeUndefined();
    expect(numericInputError(numericInput, [0])).toBeUndefined();
  });
});
