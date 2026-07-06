import { describe, expect, test } from "vitest";

import type { Quiz } from "../quiz";
import { checkCatalogProfile, formatProfileIssues } from "./catalog-profile";
import { loadPublicQuizzes } from "./public-quizzes";

function makeQuiz(overrides: Partial<Quiz> = {}): Quiz {
  return {
    schemaVersion: 1,
    id: "sample-quiz",
    title: "Sample quiz",
    description: "A perfectly fine description.",
    language: "en",
    tags: ["web"],
    questions: [
      {
        id: "q1",
        type: "single-choice",
        title: "A question?",
        explanation: "Because.",
        options: [
          { text: "Yes", isCorrect: true },
          { text: "No", isCorrect: false },
        ],
      },
    ],
    ...overrides,
  };
}

describe("checkCatalogProfile", () => {
  test("passes a conforming quiz with no issues", () => {
    expect(checkCatalogProfile(makeQuiz())).toEqual([]);
  });

  test("requires description, language, and at least one tag", () => {
    const issues = checkCatalogProfile(
      makeQuiz({ description: undefined, language: undefined, tags: [] }),
    );

    expect(issues.map((issue) => issue.path)).toEqual(["description", "language", "tags"]);
    expect(issues.every((issue) => issue.severity === "error")).toBe(true);
  });

  test("fails on raw HTML with the field path", () => {
    const issues = checkCatalogProfile(makeQuiz({ description: "Use <b>bold</b> text here." }));

    expect(issues).toHaveLength(1);
    expect(issues[0]).toMatchObject({ severity: "error", path: "description" });
    expect(issues[0]?.problem).toMatch(/Raw HTML/);
  });

  test("finds raw HTML nested in question fields", () => {
    const quiz = makeQuiz();
    const question = quiz.questions[0];
    if (question?.type !== "single-choice") throw new Error("fixture shape changed");
    question.options[1] = { text: "An <i>italic</i> option", isCorrect: false };

    const issues = checkCatalogProfile(quiz);

    expect(issues).toHaveLength(1);
    expect(issues[0]?.path).toBe("questions[0].options[1].text");
  });

  test("does not mistake code spans for raw HTML", () => {
    const issues = checkCatalogProfile(
      makeQuiz({ description: "Generics like `Array<string>` are fine." }),
    );

    expect(issues).toEqual([]);
  });

  test("warns (not fails) on block Markdown in a short field", () => {
    const issues = checkCatalogProfile(makeQuiz({ title: "# A heading title" }));

    expect(issues).toHaveLength(1);
    expect(issues[0]).toMatchObject({ severity: "warning", path: "title" });
    expect(issues[0]?.problem).toMatch(/Block Markdown/);
  });

  test("allows block Markdown in long fields", () => {
    const issues = checkCatalogProfile(
      makeQuiz({ description: "First paragraph.\n\n- a list\n- of points" }),
    );

    expect(issues).toEqual([]);
  });

  test("fails a field that is empty after sanitization", () => {
    const issues = checkCatalogProfile(makeQuiz({ description: "<script>alert(1)</script>" }));

    expect(issues.map((issue) => issue.problem).join("\n")).toMatch(/empty after Markdown/);
    expect(issues.every((issue) => issue.path === "description")).toBe(true);
  });
});

describe("profile violation fixture (CI rejection message)", () => {
  test("a quiz missing a description produces a message naming the file, the path, and the fix", () => {
    const fixtureDir = "src/shared/lib/content/fixtures/profile-violation";
    const catalog = loadPublicQuizzes(fixtureDir);
    const quiz = catalog.quizzes[0];
    if (quiz === undefined) throw new Error("fixture quiz missing");

    const issues = checkCatalogProfile(quiz);
    const message = formatProfileIssues(`${fixtureDir}/${quiz.id}.json`, issues);

    expect(message).toContain("missing-description.json");
    expect(message).toContain("at path: `description`");
    expect(message).toMatch(/Fix: Add a short `description`/);
  });
});
