import { describe, expect, test } from "vitest";

import validQuiz from "@/shared/lib/quiz/fixtures/valid/all-question-types.json";

import { validateQuizJson } from "./validate-quiz-json";

function assertValidResult(
  result: ReturnType<typeof validateQuizJson>,
): asserts result is Extract<ReturnType<typeof validateQuizJson>, { status: "valid" }> {
  if (result.status !== "valid")
    throw new Error(`Expected a valid result, received ${result.status}.`);
}

function assertInvalidResult(
  result: ReturnType<typeof validateQuizJson>,
): asserts result is Extract<ReturnType<typeof validateQuizJson>, { status: "invalid" }> {
  if (result.status !== "invalid")
    throw new Error(`Expected an invalid result, received ${result.status}.`);
}

describe("validateQuizJson", () => {
  test("returns the parsed Quiz for a valid document", () => {
    const result = validateQuizJson(JSON.stringify(validQuiz));

    assertValidResult(result);

    expect(result.quiz.id).toBe(validQuiz.id);
    expect(result.quiz.questions).toHaveLength(validQuiz.questions.length);
  });

  test("reports JSON syntax errors as a single copyable block", () => {
    const result = validateQuizJson('{\n  "id": "demo",\n  trailing\n}');

    assertInvalidResult(result);

    expect(result.report.split("\n")).toEqual([
      "This is not valid JSON, so it cannot be checked against the Quiz Object Standard yet.",
      "",
      expect.stringContaining("Problem at line"),
      "Fix: repair the JSON syntax (quotes, commas, brackets), then validate again.",
    ]);
  });

  test("points at the line and column the parser failed on", () => {
    const result = validateQuizJson('{\n  "id": "demo",\n  trailing\n}');

    assertInvalidResult(result);

    // `trailing` starts at the third character of the third line.
    expect(result.report).toContain("Problem at line 3, column 3:");
  });

  test("reports empty input as invalid JSON, not a crash", () => {
    const result = validateQuizJson("");

    expect(result.status).toBe("invalid");
  });

  test("omits the position when the parser message carries none", () => {
    // `Unexpected end of JSON input` names neither a line/column nor a position.
    const result = validateQuizJson("[1, 2,");

    assertInvalidResult(result);

    expect(result.report).toContain("Problem: ");
    expect(result.report).not.toContain("Problem at line");
  });

  test("renders schema violations through the M1 formatter, path-precise", () => {
    const broken = { ...validQuiz, title: "", bogus: true };
    const result = validateQuizJson(JSON.stringify(broken));

    assertInvalidResult(result);

    expect(result.report).toContain("Quiz Object Standard");
    expect(result.report).toContain("Path: `title`");
    expect(result.report).toContain("`bogus`");
  });
});
