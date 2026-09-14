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

    expect(issues).toEqual([
      {
        severity: "error",
        path: "description",
        problem: "The Public catalog profile requires a `description`.",
        fix: "Add a short `description` explaining what the quiz covers and who it is for.",
      },
      {
        severity: "error",
        path: "language",
        problem: "The Public catalog profile requires a `language`.",
        fix: 'Add a BCP-47 `language` tag such as `"en"`.',
      },
      {
        severity: "error",
        path: "tags",
        problem: "The Public catalog profile requires at least one Tag.",
        fix: "Add one or more kebab-case Tags so the quiz is discoverable in the Catalog filter.",
      },
    ]);
  });

  test("fails on raw HTML with the field path", () => {
    const issues = checkCatalogProfile(makeQuiz({ description: "Use <b>bold</b> text here." }));

    expect(issues).toHaveLength(1);
    expect(issues[0]).toMatchObject({ severity: "error", path: "description" });
    expect(issues[0]?.problem).toMatch(/Raw HTML/);
    expect(issues[0]?.fix).toBe(
      "Rewrite the HTML as Markdown (e.g. `**bold**`, `` `code` ``, `[text](url)`).",
    );
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
    expect(issues[0]?.fix).toBe(
      "Keep short fields to one line of inline Markdown, or move the long content to `description` / `explanation`.",
    );
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
    expect(issues.at(-1)?.fix).toBe(
      "Replace the content with text that survives sanitization (no raw-HTML-only values).",
    );
  });

  test("checks a question description as well as its title", () => {
    const quiz = makeQuiz();
    quiz.questions[0]!.description = "A <b>bold</b> aside.";

    const issues = checkCatalogProfile(quiz);

    expect(issues.map((issue) => issue.path)).toEqual(["questions[0].description"]);
  });

  test("fails when two Images repeat the same caption", () => {
    const questions: Quiz["questions"] = [
      {
        id: "q1",
        type: "single-choice",
        title: "First question?",
        explanation: "Because.",
        options: [
          { text: "Yes", isCorrect: true },
          { text: "No", isCorrect: false },
        ],
        images: [
          {
            src: "first.svg",
            alt: "First diagram",
            caption: "The same generic caption.",
          },
        ],
      },
      {
        id: "q2",
        type: "single-choice",
        title: "Second question?",
        explanation: "Because.",
        options: [
          { text: "Yes", isCorrect: true },
          { text: "No", isCorrect: false },
        ],
        images: [
          {
            src: "second.svg",
            alt: "Second diagram",
            caption: "The same generic caption.",
          },
        ],
      },
    ];

    const issues = checkCatalogProfile(makeQuiz({ questions }));

    expect(issues).toHaveLength(1);
    expect(issues[0]).toMatchObject({
      severity: "error",
      path: "questions[1].images[0].caption",
    });
    expect(issues[0]?.problem).toContain("questions[0].images[0].caption");
  });
});

describe("formatProfileIssues", () => {
  test("numbers every issue and labels warnings apart from problems", () => {
    const message = formatProfileIssues("content/quizzes/sample.json", [
      { severity: "error", path: "description", problem: "Missing.", fix: "Add one." },
      { severity: "warning", path: "title", problem: "Too long.", fix: "Shorten it." },
    ]);

    expect(message).toBe(
      [
        "Public quiz does not satisfy the Public catalog profile in content/quizzes/sample.json:",
        "",
        "1. Problem at path: `description`",
        "   Problem: Missing.",
        "   Fix: Add one.",
        "2. Warning at path: `title`",
        "   Problem: Too long.",
        "   Fix: Shorten it.",
      ].join("\n"),
    );
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
