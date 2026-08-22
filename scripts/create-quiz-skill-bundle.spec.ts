import { execFileSync } from "node:child_process";
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { afterEach, describe, expect, test } from "vitest";

/**
 * Guards the committed skill bundle. `skill:create-quiz:check` proves it matches
 * a fresh build; these tests prove that build is still the one we want — that
 * the syntax highlighter stays out (see `generate-create-quiz-skill.ts`) and
 * that dropping it did not disturb the Markdown audit it sits next to.
 */

const bundlePath = resolve("skills/create-quiz/scripts/validate-quiz.mjs");
const fixturePath = resolve("docs/examples/public-quiz-single-choice.json");
const temporaryDirectories: string[] = [];

afterEach(() => {
  for (const directory of temporaryDirectories.splice(0)) {
    rmSync(directory, { force: true, recursive: true });
  }
});

describe("create-quiz skill bundle", () => {
  const bundleSource = readFileSync(bundlePath, "utf8");

  test("ships without the syntax highlighter", () => {
    expect(bundleSource).not.toContain("node_modules/prismjs");
    expect(bundleSource).not.toContain("Prism.languages.markup");
  });

  test("still ships the dependencies validation actually needs", () => {
    expect(bundleSource).toContain("node_modules/zod");
    expect(bundleSource).toContain("node_modules/sanitize-html");
    expect(bundleSource).toContain("node_modules/marked");
  });

  test("validates a Quiz whose Explanation is a fenced code block", () => {
    const quiz = readFixture();
    quiz.questions[0].explanation = "```ts\nconst answer: number = 1;\n```";

    expect(runBundle(["--stdin"], JSON.stringify(quiz))).toContain("Validated 1 Quiz");
  });

  test("still reports a field that is empty after Markdown rendering", () => {
    const contentDirectory = makeTemporaryDirectory();
    const quiz = readFixture();
    quiz.questions[0].explanation = "<script>alert(1)</script>";
    writeFileSync(join(contentDirectory, `${quiz.id}.json`), JSON.stringify(quiz));

    expect(() => runBundle(["--profile", "catalog", contentDirectory])).toThrow(
      /empty after Markdown rendering/,
    );
  });
});

interface MutableFixture {
  id: string;
  questions: Array<{ explanation: string }>;
}

function readFixture(): MutableFixture {
  return JSON.parse(readFileSync(fixturePath, "utf8")) as MutableFixture;
}

/** Runs the bundle the way a skill user does: plain `node`, no dependencies. */
function runBundle(args: string[], input?: string): string {
  return execFileSync("node", [bundlePath, ...args], {
    encoding: "utf8",
    // Capture stderr instead of inheriting it: a failing run is an assertion
    // here, not test-log noise. execFileSync appends it to the thrown error.
    stdio: ["pipe", "pipe", "pipe"],
    ...(input !== undefined && { input }),
  });
}

function makeTemporaryDirectory(): string {
  const directory = mkdtempSync(join(tmpdir(), "create-quiz-bundle-"));
  temporaryDirectories.push(directory);
  return directory;
}
