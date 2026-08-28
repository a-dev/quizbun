import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { spawnSync } from "node:child_process";
import { afterEach, describe, expect, test } from "vitest";

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
