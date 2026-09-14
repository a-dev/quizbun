import { describe, expect, test } from "vitest";

import { checkAnswer, parseNumericInput } from "./check-answer";
import type { InputQuestion, MultipleChoiceQuestion, SingleChoiceQuestion } from "./schema";

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
    { text: "Also yes", isCorrect: true },
  ],
};

function inputQuestion(validation: InputQuestion["validation"]): InputQuestion {
  return { id: "in", title: "Type it", explanation: "Because.", type: "input", validation };
}

describe("checkAnswer: single-choice", () => {
  test("correct Option index is correct", () => {
    expect(checkAnswer(singleChoice, 1)).toBe(true);
  });

  test("incorrect or out-of-range index is incorrect", () => {
    expect(checkAnswer(singleChoice, 0)).toBe(false);
    expect(checkAnswer(singleChoice, 5)).toBe(false);
  });
});

describe("checkAnswer: multiple-choice (all-or-nothing)", () => {
  test("exactly the correct set is correct, regardless of order", () => {
    expect(checkAnswer(multipleChoice, [0, 2])).toBe(true);
    expect(checkAnswer(multipleChoice, [2, 0])).toBe(true);
  });

  test("subsets, supersets, and the empty set are incorrect", () => {
    expect(checkAnswer(multipleChoice, [0])).toBe(false);
    expect(checkAnswer(multipleChoice, [0, 1, 2])).toBe(false);
    expect(checkAnswer(multipleChoice, [])).toBe(false);
  });

  test("a set of the right size but the wrong members is incorrect", () => {
    // One right, one wrong: the same count as the correct set, so only a
    // member-by-member comparison separates it from a correct answer.
    expect(checkAnswer(multipleChoice, [0, 1])).toBe(false);
  });

  test("repeated indexes collapse rather than inflating the count", () => {
    expect(checkAnswer(multipleChoice, [0, 0, 2])).toBe(true);
  });
});

describe("checkAnswer: submissions of the wrong shape", () => {
  test("a non-number is incorrect for single-choice", () => {
    expect(checkAnswer(singleChoice, "1")).toBe(false);
    expect(checkAnswer(singleChoice, [1])).toBe(false);
  });

  test("a non-array is incorrect for multiple-choice", () => {
    expect(checkAnswer(multipleChoice, 0)).toBe(false);
    expect(checkAnswer(multipleChoice, "0,2")).toBe(false);
  });

  test("a non-string is incorrect for input", () => {
    const question = inputQuestion({ mode: "numeric", acceptedAnswers: [42] });

    expect(checkAnswer(question, 42)).toBe(false);
    expect(checkAnswer(question, [42])).toBe(false);
  });
});

describe("checkAnswer: text input", () => {
  const question = inputQuestion({ mode: "text", acceptedAnswers: ["Café au lait"] });

  test("matches case-insensitively after trim, whitespace collapse, and NFC", () => {
    expect(checkAnswer(question, "  café   AU lait ")).toBe(true);
    // "é" as "e" + combining accent (NFD) must match the NFC accepted answer.
    expect(checkAnswer(question, "café au lait")).toBe(true);
  });

  test("folds case down, so an uppercase expansion is not a match", () => {
    // "ß" uppercases to "SS", so case folding upward would accept "STRASSE".
    // Folding down keeps "straße" and "strasse" distinct, as the Standard says.
    const sharpS = inputQuestion({ mode: "text", acceptedAnswers: ["Straße"] });

    expect(checkAnswer(sharpS, "STRASSE")).toBe(false);
    expect(checkAnswer(sharpS, "STRAßE")).toBe(true);
  });

  test("collapses runs of whitespace but does not remove it", () => {
    const twoWords = inputQuestion({ mode: "text", acceptedAnswers: ["red panda"] });

    expect(checkAnswer(twoWords, "red \t panda")).toBe(true);
    expect(checkAnswer(twoWords, "redpanda")).toBe(false);
  });

  test("caseSensitive requires an exact case match after normalization", () => {
    const sensitive = inputQuestion({
      mode: "text",
      acceptedAnswers: ["Café au lait"],
      caseSensitive: true,
    });

    expect(checkAnswer(sensitive, " Café  au lait ")).toBe(true);
    expect(checkAnswer(sensitive, "café au lait")).toBe(false);
  });

  test("any Accepted answer matching is enough", () => {
    const multi = inputQuestion({ mode: "text", acceptedAnswers: ["one", "two"] });

    expect(checkAnswer(multi, "two")).toBe(true);
    expect(checkAnswer(multi, "three")).toBe(false);
  });
});

describe("checkAnswer: numeric input", () => {
  const question = inputQuestion({ mode: "numeric", acceptedAnswers: [3.14], tolerance: 0.01 });

  test("matches within tolerance, with dot or comma decimal separator", () => {
    expect(checkAnswer(question, "3.14")).toBe(true);
    expect(checkAnswer(question, " 3,15 ")).toBe(true);
    expect(checkAnswer(question, "3.16")).toBe(false);
  });

  test("tolerance defaults to 0", () => {
    const exact = inputQuestion({ mode: "numeric", acceptedAnswers: [42] });

    expect(checkAnswer(exact, "42")).toBe(true);
    expect(checkAnswer(exact, "42.0001")).toBe(false);
  });

  test("any Accepted answer within tolerance is enough", () => {
    const multi = inputQuestion({ mode: "numeric", acceptedAnswers: [10, 20], tolerance: 0.5 });

    expect(checkAnswer(multi, "20.4")).toBe(true);
    expect(checkAnswer(multi, "10")).toBe(true);
    expect(checkAnswer(multi, "15")).toBe(false);
  });

  test("unparseable submissions are incorrect", () => {
    expect(checkAnswer(question, "pi")).toBe(false);
    expect(checkAnswer(question, "3.1.4")).toBe(false);
  });
});

describe("parseNumericInput", () => {
  test("trims and accepts dot or comma decimals", () => {
    // Exact equality is the contract under test: the parser has to land on the
    // same double `3.14` denotes, so a tolerance would hide a real regression.
    // oxlint-disable-next-line sonarjs/no-floating-point-equality
    expect(parseNumericInput(" 3.14 ")).toBe(3.14);
    // oxlint-disable-next-line sonarjs/no-floating-point-equality
    expect(parseNumericInput("3,14")).toBe(3.14);
    expect(parseNumericInput("-0,5")).toBe(-0.5);
    expect(parseNumericInput(".5")).toBe(0.5);
    expect(parseNumericInput(".25")).toBe(0.25);
    expect(parseNumericInput("7.")).toBe(7);
  });

  test("rejects both separators, thousands separators, and non-numbers", () => {
    expect(parseNumericInput("1,234.5")).toBeUndefined();
    expect(parseNumericInput("1.234.5")).toBeUndefined();
    expect(parseNumericInput("1,234,5")).toBeUndefined();
    expect(parseNumericInput("abc")).toBeUndefined();
    expect(parseNumericInput("")).toBeUndefined();
    expect(parseNumericInput("1e5x")).toBeUndefined();
  });

  test("rejects notations JavaScript would happily parse", () => {
    // The pattern has to match the whole string, not merely start or end it:
    // `Number("1e5")` is a finite 100000, so anything less than a full-string
    // match would quietly accept exponent and hex notation the Standard's
    // "Numeric matching rules" do not allow.
    expect(parseNumericInput("1e5")).toBeUndefined();
    expect(parseNumericInput("1E5")).toBeUndefined();
    expect(parseNumericInput("0x10")).toBeUndefined();
    expect(parseNumericInput("Infinity")).toBeUndefined();
    expect(parseNumericInput("12abc")).toBeUndefined();
    expect(parseNumericInput("abc12")).toBeUndefined();
  });
});
