import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { afterEach, describe, expect, test } from "vitest";

import { validateStandardInput, validateTarget } from "./create-quiz-validator";

const fixturePath = resolve("docs/examples/public-quiz-single-choice.json");
const temporaryDirectories: string[] = [];

afterEach(() => {
  for (const directory of temporaryDirectories.splice(0)) {
    rmSync(directory, { force: true, recursive: true });
  }
});

describe("create-quiz standalone validation", () => {
  test("accepts a valid Quiz from standard input", async () => {
    const result = await validateStandardInput(readFileSync(fixturePath, "utf8"), {
      checkMedia: false,
    });

    expect(result.output).toContain("Validated 1 Quiz from standard input");
  });

  test("enforces cross-field Standard rules that JSON Schema cannot express", async () => {
    const quiz = readFixture();
    quiz.questions[0].options[0].isCorrect = true;

    await expect(
      validateStandardInput(JSON.stringify(quiz), { checkMedia: false }),
    ).rejects.toThrow(/questions\[0\]\.options[\s\S]*exactly one correct Option/);
  });

  test("keeps Markdown checks out of the Standard profile", async () => {
    const quiz = readFixture();
    quiz.description = "Use <b>raw HTML</b> here.";

    await expect(
      validateStandardInput(JSON.stringify(quiz), { checkMedia: false }),
    ).resolves.toMatchObject({ warnings: [] });
  });

  test("applies Markdown checks and Catalog metadata rules in the Catalog profile", async () => {
    const contentDirectory = makeTemporaryDirectory();
    const quiz = readFixture();
    delete quiz.language;
    quiz.description = "<script>alert(1)</script>";
    writeFileSync(join(contentDirectory, `${quiz.id}.json`), JSON.stringify(quiz));

    await expect(
      validateTarget(contentDirectory, { checkMedia: false, profile: "catalog" }),
    ).rejects.toThrow(/path: `language`[\s\S]*Raw HTML[\s\S]*empty after Markdown/);
  });
});

interface MutableFixture {
  description: string;
  id: string;
  language?: string;
  questions: Array<{
    options: Array<{ isCorrect: boolean; text: string }>;
  }>;
}

function readFixture(): MutableFixture {
  return JSON.parse(readFileSync(fixturePath, "utf8")) as MutableFixture;
}

function makeTemporaryDirectory(): string {
  const directory = mkdtempSync(join(tmpdir(), "create-quiz-validator-"));
  temporaryDirectories.push(directory);
  return directory;
}
