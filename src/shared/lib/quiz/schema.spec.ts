import { readdir, readFile } from "node:fs/promises";
import { describe, expect, test } from "vitest";

import { quizSchema, type Quiz } from "./schema";

const fixturesUrl = new URL("./fixtures/", import.meta.url);

async function readJsonFixtures(kind: "valid" | "invalid") {
  const directoryUrl = new URL(`${kind}/`, fixturesUrl);
  const fileNames = (await readdir(directoryUrl))
    .filter((fileName) => fileName.endsWith(".json"))
    .sort();

  return Promise.all(
    fileNames.map(async (fileName) => {
      const fileUrl = new URL(fileName, directoryUrl);
      const contents = await readFile(fileUrl, "utf8");

      return {
        fileName,
        value: JSON.parse(contents) as unknown,
      };
    }),
  );
}

describe("quizSchema", () => {
  test("accepts every valid fixture", async () => {
    const fixtures = await readJsonFixtures("valid");

    expect(fixtures.length).toBeGreaterThan(0);

    for (const fixture of fixtures) {
      const result = quizSchema.safeParse(fixture.value);

      expect(result.success, fixture.fileName).toBe(true);
    }
  });

  test("applies quiz-level defaults", async () => {
    const fixture = JSON.parse(
      await readFile(new URL("valid/minimal-input-text.json", fixturesUrl), "utf8"),
    ) as unknown;

    const quiz = quizSchema.parse(fixture) as Quiz;

    expect(quiz.tags).toEqual([]);
  });

  test("rejects every invalid fixture", async () => {
    const fixtures = await readJsonFixtures("invalid");

    expect(fixtures.length).toBeGreaterThan(0);

    for (const fixture of fixtures) {
      const result = quizSchema.safeParse(fixture.value);

      expect(result.success, fixture.fileName).toBe(false);
    }
  });
});
