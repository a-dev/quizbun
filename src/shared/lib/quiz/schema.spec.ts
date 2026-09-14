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

function quizWithImage(image: Record<string, unknown>) {
  const quiz = quizWithImageSrc("diagram.svg") as {
    questions: Array<{ images: Array<Record<string, unknown>> }>;
  };
  quiz.questions[0]!.images = [image];

  return quiz;
}

/** The issue messages for one failed parse, keyed by dotted path. */
function issuesByPath(value: unknown): Record<string, string[]> {
  const result = quizSchema.safeParse(value);

  if (result.success) throw new Error("Expected the document to be rejected.");

  const byPath: Record<string, string[]> = {};

  for (const issue of result.error.issues) {
    const path = issue.path.join(".");
    const messages = byPath[path] ?? [];

    messages.push(issue.message);
    byPath[path] = messages;
  }

  return byPath;
}

describe("quizSchema", () => {
  test("accepts every valid fixture", async () => {
    const fixtures = await readJsonFixtures("valid");

    expect(fixtures.length).toBeGreaterThan(0);

    for (const fixture of fixtures) {
      const result = quizSchema.safeParse(fixture.value);

      expect(result.success).toBe(true);
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

  test("separates a missing field from a field of the wrong type", () => {
    const { title, ...withoutTitle } = quizWithImageSrc("diagram.svg");

    expect(issuesByPath(withoutTitle).title).toEqual(["Required field missing."]);
    expect(issuesByPath({ ...withoutTitle, title: 7 }).title).toEqual(["Expected a string."]);
    expect(title).toBe("Image src probe");
  });

  test("separates a missing array from a value that is not an array", () => {
    const { questions, ...withoutQuestions } = quizWithImageSrc("diagram.svg");

    expect(issuesByPath(withoutQuestions).questions).toEqual(["Required field missing."]);
    expect(issuesByPath({ ...withoutQuestions, questions: "one" }).questions).toEqual([
      "Expected an array.",
    ]);
    expect(questions).toHaveLength(1);
  });

  test("says which way an image `src` is wrong", () => {
    expect(issuesByPath(quizWithImage({ alt: "A diagram" }))["questions.0.images.0.src"]).toEqual([
      "Required field missing.",
    ]);

    expect(
      issuesByPath(quizWithImageSrc("http://example.com/a.png"))["questions.0.images.0.src"],
    ).toEqual(["Use `https`, not `http`."]);

    expect(issuesByPath(quizWithImageSrc("Cache_Tiers.bmp"))["questions.0.images.0.src"]).toEqual([
      "Use an `https://` URL or a bare asset filename (kebab-case name plus png/jpg/jpeg/webp/avif/gif/svg).",
    ]);
  });

  test("requires image `width` and `height` together", () => {
    const issues = issuesByPath(
      quizWithImage({ src: "diagram.svg", alt: "A diagram", width: 100 }),
    );

    // The issue is reported on the field the author still has to write.
    expect(issues["questions.0.images.0.height"]).toEqual([
      "Set `width` and `height` together, or omit both. `height` is missing.",
    ]);

    expect(
      issuesByPath(quizWithImage({ src: "diagram.svg", alt: "A diagram", height: 100 }))[
        "questions.0.images.0.width"
      ],
    ).toEqual(["Set `width` and `height` together, or omit both. `width` is missing."]);
  });

  test("requires a whole pixel count of 1 or more for image dimensions", () => {
    for (const size of [0, 1.5]) {
      expect(
        issuesByPath(
          quizWithImage({ src: "diagram.svg", alt: "A diagram", width: size, height: size }),
        )["questions.0.images.0.width"],
      ).toContain("Use a whole number of pixels, 1 or greater.");
    }
  });

  test("points a multiple-choice Question with no correct Option at `options`", () => {
    const quiz = quizWithImageSrc("diagram.svg") as {
      questions: Array<Record<string, unknown>>;
    };
    quiz.questions[0] = {
      id: "probe",
      type: "multiple-choice",
      title: "Probe?",
      explanation: "Explanation.",
      options: [
        { text: "One", isCorrect: false },
        { text: "Two", isCorrect: false },
      ],
    };

    expect(issuesByPath(quiz)["questions.0.options"]).toEqual([
      "A multiple-choice Question must have at least one correct Option.",
    ]);
  });

  test("rejects every invalid fixture", async () => {
    const fixtures = await readJsonFixtures("invalid");

    expect(fixtures.length).toBeGreaterThan(0);

    for (const fixture of fixtures) {
      const result = quizSchema.safeParse(fixture.value);

      expect(result.success).toBe(false);
    }
  });
});
