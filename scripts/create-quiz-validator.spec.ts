import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { afterEach, describe, expect, test } from "vitest";

import { parseCliArguments, validateStandardInput, validateTarget } from "./create-quiz-validator";

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

describe("Standard profile targets", () => {
  test("validates a single Quiz file", async () => {
    const result = await validateTarget(fixturePath, { checkMedia: false, profile: "standard" });

    expect(result.output).toContain("Validated 1 Quiz file(s)");
  });

  test("validates every `*.json` entry in a directory, ignoring subdirectories", async () => {
    const directory = makeTemporaryDirectory();
    const quiz = readFixture();
    writeFileSync(join(directory, "one.json"), JSON.stringify({ ...quiz, id: "one" }));
    writeFileSync(join(directory, "two.json"), JSON.stringify({ ...quiz, id: "two" }));
    writeFileSync(join(directory, "notes.md"), "not a Quiz");
    mkdirSync(join(directory, "assets"));
    writeFileSync(join(directory, "assets", "nested.json"), "{ broken");

    const result = await validateTarget(directory, { checkMedia: false, profile: "standard" });

    expect(result.output).toContain("Validated 2 Quiz file(s)");
  });

  test("names the offending file when one entry in a directory is invalid", async () => {
    const directory = makeTemporaryDirectory();
    writeFileSync(join(directory, "good.json"), readFileSync(fixturePath, "utf8"));
    writeFileSync(join(directory, "package.json"), JSON.stringify({ name: "not-a-quiz" }));

    await expect(
      validateTarget(directory, { checkMedia: false, profile: "standard" }),
    ).rejects.toThrow(/Quiz validation failed in .*package\.json/);
  });

  test("rejects a missing target", async () => {
    await expect(
      validateTarget(join(makeTemporaryDirectory(), "absent.json"), {
        checkMedia: false,
        profile: "standard",
      }),
    ).rejects.toThrow(/Validation target does not exist/);
  });

  test("rejects a target that is neither a JSON file nor a directory", async () => {
    const directory = makeTemporaryDirectory();
    const notJson = join(directory, "quiz.txt");
    writeFileSync(notJson, "{}");

    await expect(
      validateTarget(notJson, { checkMedia: false, profile: "standard" }),
    ).rejects.toThrow(/must be a JSON file or directory/);
  });

  test("rejects a directory with no JSON entries", async () => {
    const directory = makeTemporaryDirectory();
    writeFileSync(join(directory, "readme.md"), "nothing here");

    await expect(
      validateTarget(directory, { checkMedia: false, profile: "standard" }),
    ).rejects.toThrow(/No Quiz JSON files found/);
  });

  test("requires a directory for the Catalog profile", async () => {
    await expect(
      validateTarget(fixturePath, { checkMedia: false, profile: "catalog" }),
    ).rejects.toThrow(/Catalog validation target must be a directory/);
  });
});

describe("parseCliArguments", () => {
  test("defaults to the Standard profile with no network checks", () => {
    expect(parseCliArguments(["quiz.json"])).toEqual({
      checkMedia: false,
      help: false,
      profile: "standard",
      stdin: false,
      target: "quiz.json",
    });
  });

  test("accepts `--profile` as a separate argument and as `--profile=`", () => {
    expect(parseCliArguments(["--profile", "catalog", "content/quizzes"]).profile).toBe("catalog");
    expect(parseCliArguments(["--profile=catalog", "content/quizzes"]).profile).toBe("catalog");
  });

  test("reads `--stdin` and `-` as the same flag", () => {
    expect(parseCliArguments(["--stdin"]).stdin).toBe(true);
    expect(parseCliArguments(["-"]).stdin).toBe(true);
  });

  test("reports help before anything else is resolved", () => {
    expect(parseCliArguments(["--help"]).help).toBe(true);
    expect(parseCliArguments(["-h"]).help).toBe(true);
  });

  test("rejects an unknown profile, including a missing `--profile` value", () => {
    expect(() => parseCliArguments(["--profile", "strict", "quiz.json"])).toThrow(/`standard`/);
    expect(() => parseCliArguments(["quiz.json", "--profile"])).toThrow(/`standard`/);
  });

  test("rejects an unknown option", () => {
    expect(() => parseCliArguments(["--strict", "quiz.json"])).toThrow(/Unknown option: --strict/);
  });

  test("rejects a second validation target", () => {
    expect(() => parseCliArguments(["one.json", "two.json"])).toThrow(/not both one.json and two/);
  });

  test("rejects `--stdin` combined with a target", () => {
    expect(() => parseCliArguments(["--stdin", "quiz.json"])).toThrow(/either `--stdin` or a file/);
  });

  test("rejects a run with no target at all", () => {
    expect(() => parseCliArguments([])).toThrow(/Provide a Quiz JSON file/);
  });

  test("rejects the Catalog profile on standard input", () => {
    expect(() => parseCliArguments(["--profile", "catalog", "--stdin"])).toThrow(
      /Catalog validation requires a directory/,
    );
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
