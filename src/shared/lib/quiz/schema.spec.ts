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

function quizWithImageSrc(src: string) {
  return {
    schemaVersion: 1,
    id: "image-src-probe",
    title: "Image src probe",
    questions: [
      {
        id: "probe",
        type: "single-choice",
        title: "Probe?",
        explanation: "Explanation.",
        images: [{ src, alt: "A diagram" }],
        options: [
          { text: "Correct", isCorrect: true },
          { text: "Incorrect", isCorrect: false },
        ],
      },
    ],
  };
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

  test("keeps `placement` absent when the author omitted it", async () => {
    const fixture = JSON.parse(
      await readFile(new URL("valid/quiz-with-media.json", fixturesUrl), "utf8"),
    ) as unknown;

    const quiz = quizSchema.parse(fixture) as Quiz;

    // No `.default()` on `placement`: the Renderer resolves absent to
    // `question`, so parsing never materializes a field the author did not
    // write and Exports stay byte-faithful.
    expect(quiz.questions[0]?.images?.[1]).not.toHaveProperty("placement");
    expect(quiz.questions[0]?.images?.[0]?.placement).toBe("question");
    expect(quiz.questions[2]?.videos?.[0]?.start).toBe(90);
    expect(quiz.questions[2]?.videos?.[1]?.placement).toBe("explanation");
  });

  test.each([
    ["a bare asset filename", "cache-tiers.svg"],
    ["a numbered filename", "float-bits-2.png"],
    ["an https URL", "https://example.com/diagram.webp"],
  ])("accepts %s as an image `src`", (_label, src) => {
    expect(quizSchema.safeParse(quizWithImageSrc(src)).success).toBe(true);
  });

  test.each([
    ["http", "http://example.com/diagram.png"],
    ["protocol-relative", "//example.com/diagram.png"],
    ["a data URI", "data:image/png;base64,AAAA"],
    ["a subdirectory", "diagrams/cache.svg"],
    ["a leading slash", "/cache.svg"],
    ["a disallowed extension", "cache.bmp"],
    ["a non-kebab basename", "Cache_Tiers.svg"],
  ])("rejects %s as an image `src`", (_label, src) => {
    expect(quizSchema.safeParse(quizWithImageSrc(src)).success).toBe(false);
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
