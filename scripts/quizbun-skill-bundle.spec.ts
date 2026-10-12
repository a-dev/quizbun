import { spawnSync } from "node:child_process";
import { cpSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { afterEach, describe, expect, test } from "vitest";

import { MAX_IMPORT_QUESTIONS } from "../src/shared/lib/quiz/import-limits";
import { decodeQuizLink, readQuizLinkFragment } from "../src/shared/lib/quiz-link";

/**
 * Guards the committed `quizbun` skill bundle. Both skills are installed as
 * siblings in a temporary folder, the way the Skills CLI lays them out, and
 * the generated script runs with plain `node`.
 */

const fixturePath = resolve("docs/examples/public-quiz-single-choice.json");
const temporaryDirectories: string[] = [];

afterEach(() => {
  for (const directory of temporaryDirectories.splice(0)) {
    rmSync(directory, { force: true, recursive: true });
  }
});

interface Fixture {
  id: string;
  title: string;
  questions: Array<Record<string, unknown>>;
}

describe("quizbun skill bundle", () => {
  test("ships only the CLI, the Import limits and the codec", () => {
    const source = readFileSync("skills/quizbun/scripts/open-quiz.mjs", "utf8");

    expect(source).not.toContain("node_modules");
    expect(source.length).toBeLessThan(40_000);
  });

  test("writes a launcher whose link decodes to the same Quiz", async () => {
    const { directory, quizPath } = installSkills(readFixture());
    const run = runOpenQuiz(directory, [quizPath, "--print-url"]);

    expect(run.status).toBe(0);

    const url = run.stdout.trim().split("\n").at(-1) ?? "";
    const payload = readQuizLinkFragment(new URL(url).hash);
    const decoded = await decodeQuizLink(payload ?? "");

    expect(url.startsWith("https://quizbun.fyi/import/#qos=1.")).toBe(true);
    expect(decoded).toEqual({
      status: "decoded",
      json: JSON.stringify(JSON.parse(readFileSync(quizPath, "utf8"))),
    });
    expect(readFileSync(join(directory, `${readFixture().id}.open.html`), "utf8")).toContain(
      "location.replace(",
    );
  });

  test("does not print the link unless asked", () => {
    const { directory, quizPath } = installSkills(readFixture());

    expect(runOpenQuiz(directory, [quizPath]).stdout).not.toContain("#qos=");
  });

  test("exits with 1 and the validator's report for an invalid Quiz", () => {
    const quiz = readFixture() as Fixture & { extra?: boolean };
    quiz.extra = true;
    const { directory, quizPath } = installSkills(quiz);
    const run = runOpenQuiz(directory, [quizPath]);

    expect(run.status).toBe(1);
    expect(run.stderr).toContain("extra");
  });

  test("exits with 2 and writes no launcher for a Quiz over the Question limit", () => {
    const quiz = readFixture();
    const [question] = quiz.questions;
    quiz.questions = Array.from({ length: MAX_IMPORT_QUESTIONS + 1 }, (_, index) => ({
      ...question,
      id: `question-${index}`,
    }));
    const { directory, quizPath } = installSkills(quiz);
    const run = runOpenQuiz(directory, [quizPath]);

    expect(run.status).toBe(2);
    expect(run.stderr).toContain("This is a Quizbun limit, not a Standard error.");
    expect(run.stderr).toContain("201 Questions");
    expect(() => readFileSync(join(directory, `${quiz.id}.open.html`))).toThrow(/ENOENT/);
  });

  test("exits with 3 and the install command when create-quiz is missing", () => {
    const { directory, quizPath } = installSkills(readFixture(), { withCreateQuiz: false });
    const run = runOpenQuiz(directory, [quizPath]);

    expect(run.status).toBe(3);
    expect(run.stderr).toContain("npx skills add a-dev/quizbun --skill create-quiz");
  });

  test("escapes a Quiz title that would close the script element", () => {
    const quiz = readFixture();
    quiz.title = `</script><script>alert("x")</script> 'quoted' & more`;
    const { directory, quizPath } = installSkills(quiz);

    expect(runOpenQuiz(directory, [quizPath]).status).toBe(0);

    const html = readFileSync(join(directory, `${quiz.id}.open.html`), "utf8");

    expect(html).not.toContain("<script>alert");
    expect(html).toContain("&lt;/script&gt;");
    expect(html.match(/<script>/g)).toHaveLength(1);
  });
});

function readFixture(): Fixture {
  return JSON.parse(readFileSync(fixturePath, "utf8")) as Fixture;
}

function installSkills(
  quiz: Fixture,
  { withCreateQuiz = true }: { withCreateQuiz?: boolean } = {},
): { directory: string; quizPath: string } {
  const directory = mkdtempSync(join(tmpdir(), "quizbun-skill-"));
  temporaryDirectories.push(directory);

  cpSync("skills/quizbun", join(directory, "skills/quizbun"), { recursive: true });
  if (withCreateQuiz) {
    cpSync("skills/create-quiz", join(directory, "skills/create-quiz"), { recursive: true });
  }

  const quizDirectory = join(directory, "work");
  mkdirSync(quizDirectory);
  const quizPath = join(quizDirectory, "quiz.json");
  writeFileSync(quizPath, JSON.stringify(quiz));

  return { directory: quizDirectory, quizPath };
}

function runOpenQuiz(workDirectory: string, args: string[]) {
  const script = join(workDirectory, "../skills/quizbun/scripts/open-quiz.mjs");

  return spawnSync("node", [script, ...args], { encoding: "utf8" });
}
