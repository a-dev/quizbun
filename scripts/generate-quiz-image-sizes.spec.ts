import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { spawnSync } from "node:child_process";
import { afterEach, describe, expect, test } from "vitest";

const OPTIONS = '[{ "text": "This one", "isCorrect": true }, { "text": "No", "isCorrect": false }]';

/** Deliberately uneven author formatting; every byte outside an Image must survive. */
const UNSIZED_QUIZ_SOURCE = `{
  "schemaVersion": 1,
  "id": "sample-quiz",
  "title": "Sample quiz",
  "questions": [
    {
      "id": "question-one",
      "title": "Is this Image object written on one line?",
      "type": "single-choice",
      "images": [{ "src": "diagram.svg", "alt": "A" }],
      "options": ${OPTIONS},
      "explanation": "The first Option is correct."
    },
    {
      "id": "question-two",
      "title": "Does a stale lone width get repaired?",
      "type": "single-choice",
      "images": [
        {
          "src": "wide.svg",
          "alt": "B",
          "width": 999
        }
      ],
      "options": ${OPTIONS},
      "explanation": "The first Option is correct."
    }
  ]
}
`;

const temporaryDirectories: string[] = [];

afterEach(() => {
  for (const directory of temporaryDirectories.splice(0)) {
    rmSync(directory, { force: true, recursive: true });
  }
});

describe("quiz:sizes:check", () => {
  test("fails when an Image is replaced without regenerating its dimensions", () => {
    const contentDirectory = makeCatalogWithImage({ height: 10, width: 20 });
    const imagePath = join(contentDirectory, "sample-quiz", "diagram.svg");

    writeFileSync(imagePath, '<svg viewBox="0 0 30 15"></svg>');

    const result = spawnSync(
      "bun",
      ["scripts/generate-quiz-image-sizes.ts", "--check", contentDirectory],
      { cwd: process.cwd(), encoding: "utf8" },
    );

    expect(result.status).toBe(1);
    expect(result.stderr).toMatch(/questions\[0\]\.images\[0\]: 20×10 → 30×15/);
    expect(result.stderr).toContain("Run `bun run quiz:sizes:generate`");
  });
});

describe("quiz:sizes:generate", () => {
  test("writes missing dimensions without reformatting the rest of the file", () => {
    const contentDirectory = mkdtempSync(join(tmpdir(), "quizbun-image-sizes-"));
    temporaryDirectories.push(contentDirectory);
    mkdirSync(join(contentDirectory, "sample-quiz"));
    writeFileSync(
      join(contentDirectory, "sample-quiz", "diagram.svg"),
      '<svg viewBox="0 0 20 10"></svg>',
    );
    writeFileSync(
      join(contentDirectory, "sample-quiz", "wide.svg"),
      '<svg viewBox="0 0 40 30"></svg>',
    );

    const quizPath = join(contentDirectory, "sample-quiz.json");
    // Author formatting this script must leave alone, written inline rather
    // than as a fixture file so the formatter cannot tidy it away: an Image on
    // one line, and one carrying a stale lone `width` the Standard rejects.
    writeFileSync(quizPath, UNSIZED_QUIZ_SOURCE);

    const result = spawnSync("bun", ["scripts/generate-quiz-image-sizes.ts", contentDirectory], {
      cwd: process.cwd(),
      encoding: "utf8",
    });

    expect(
      result.status,
      result.error?.message || result.stderr || result.stdout || "Child process failed silently.",
    ).toBe(0);
    expect(readFileSync(quizPath, "utf8")).toBe(
      UNSIZED_QUIZ_SOURCE.replace(
        '{ "src": "diagram.svg", "alt": "A" }',
        '{ "src": "diagram.svg", "alt": "A", "width": 20, "height": 10 }',
      ).replace('"width": 999', '"width": 40,\n          "height": 30'),
    );
  });

  test("leaves an already-current catalog byte for byte identical", () => {
    const contentDirectory = makeCatalogWithImage({ height: 10, width: 20 });
    const quizPath = join(contentDirectory, "sample-quiz.json");
    const before = readFileSync(quizPath, "utf8");

    const result = spawnSync("bun", ["scripts/generate-quiz-image-sizes.ts", contentDirectory], {
      cwd: process.cwd(),
      encoding: "utf8",
    });

    expect(
      result.status,
      result.error?.message || result.stderr || result.stdout || "Child process failed silently.",
    ).toBe(0);
    expect(readFileSync(quizPath, "utf8")).toBe(before);
  });
});

function makeCatalogWithImage(dimensions: { height: number; width: number }) {
  const contentDirectory = mkdtempSync(join(tmpdir(), "quizbun-image-sizes-"));
  const assetDirectory = join(contentDirectory, "sample-quiz");
  temporaryDirectories.push(contentDirectory);
  mkdirSync(assetDirectory);

  const quiz = {
    schemaVersion: 1,
    id: "sample-quiz",
    title: "Sample quiz",
    questions: [
      {
        id: "question-one",
        title: "Which Option is correct?",
        type: "single-choice",
        images: [{ src: "diagram.svg", alt: "A test diagram", ...dimensions }],
        options: [
          { text: "This one", isCorrect: true },
          { text: "Not this one", isCorrect: false },
        ],
        explanation: "The first Option is correct.",
      },
    ],
  };

  writeFileSync(join(contentDirectory, "sample-quiz.json"), JSON.stringify(quiz));
  writeFileSync(join(assetDirectory, "diagram.svg"), '<svg viewBox="0 0 20 10"></svg>');

  return contentDirectory;
}
