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

    expect(result.report).toContain("not valid JSON");
    expect(result.report).toContain("Fix:");
  });

  test("reports empty input as invalid JSON, not a crash", () => {
    const result = validateQuizJson("");

    expect(result.status).toBe("invalid");
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
