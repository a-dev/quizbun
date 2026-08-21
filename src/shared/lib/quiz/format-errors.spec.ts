import { describe, expect, test } from "vitest";

import { formatQuizValidationErrors } from "./format-errors";
import { quizSchema } from "./schema";

function reportFor(value: unknown) {
  const result = quizSchema.safeParse(value);

  expect(result.success).toBe(false);

  if (result.success) {
    throw new Error("Expected fixture to be invalid.");
  }

  return formatQuizValidationErrors(result.error);
}

const validBaseQuiz = {
  schemaVersion: 1,
  id: "sample-quiz",
  title: "Sample quiz",
  questions: [
    {
      id: "first-question",
      type: "single-choice",
      title: "First question",
      explanation: "Explanation.",
      options: [
        { text: "Correct", isCorrect: true },
        { text: "Incorrect", isCorrect: false },
      ],
    },
  ],
};

function reportForQuestionMedia(media: Record<string, unknown>) {
  return reportFor({
    ...validBaseQuiz,
    questions: [{ ...validBaseQuiz.questions[0], ...media }],
  });
}

describe("formatQuizValidationErrors", () => {
  test("formats unknown fields", () => {
    expect(
      reportFor({
        ...validBaseQuiz,
        questionsPerPage: 5,
      }),
    ).toMatchInlineSnapshot(`
"Quiz JSON is invalid. Please revise it to satisfy the Quiz Object Standard.

1. Path: \`questionsPerPage\`
   Problem: Unknown field \`questionsPerPage\`.
   Fix: Remove unknown fields; the Standard is strict at every level."
`);
  });

  test("formats wrong scalar types", () => {
    expect(
      reportFor({
        ...validBaseQuiz,
        schemaVersion: "1.0",
      }),
    ).toMatchInlineSnapshot(`
"Quiz JSON is invalid. Please revise it to satisfy the Quiz Object Standard.

1. Path: \`schemaVersion\`
   Problem: Set \`schemaVersion\` to the integer \`1\`.
   Fix: Use \`"schemaVersion": 1\`. Version strings such as \`"1.0"\` are invalid."
`);
  });

  test("formats missing required fields", () => {
    const { title: _title, ...quizWithoutTitle } = validBaseQuiz;

    expect(reportFor(quizWithoutTitle)).toMatchInlineSnapshot(`
"Quiz JSON is invalid. Please revise it to satisfy the Quiz Object Standard.

1. Path: \`title\`
   Problem: Required field is missing.
   Fix: Add this required field using the shape defined by the Standard."
`);
  });

  test("formats bad id and tag charset", () => {
    expect(
      reportFor({
        ...validBaseQuiz,
        id: "Bad_Id",
        tags: ["two words"],
      }),
    ).toMatchInlineSnapshot(`
"Quiz JSON is invalid. Please revise it to satisfy the Quiz Object Standard.

1. Path: \`id\`
   Problem: Use kebab-case with lowercase latin letters, digits, and single hyphens.
   Fix: Use lowercase latin letters, digits, and single hyphens; do not use spaces, underscores, or leading/trailing hyphens.
2. Path: \`tags[0]\`
   Problem: Use kebab-case with lowercase latin letters, digits, and single hyphens.
   Fix: Use lowercase latin letters, digits, and single hyphens; do not use spaces, underscores, or leading/trailing hyphens."
`);
  });

  test("formats discriminated union mistakes", () => {
    expect(
      reportFor({
        ...validBaseQuiz,
        questions: [
          {
            ...validBaseQuiz.questions[0],
            type: "choice",
          },
        ],
      }),
    ).toMatchInlineSnapshot(`
"Quiz JSON is invalid. Please revise it to satisfy the Quiz Object Standard.

1. Path: \`questions[0].type\`
   Problem: Set \`type\` to \`single-choice\`, \`multiple-choice\`, or \`input\`.
   Fix: Use one of: \`single-choice\`, \`multiple-choice\`, \`input\`."
`);
  });

  test("formats cross-field violations", () => {
    expect(
      reportFor({
        ...validBaseQuiz,
        questions: [
          {
            ...validBaseQuiz.questions[0],
            options: [
              { text: "First", isCorrect: true },
              { text: "Second", isCorrect: true },
            ],
          },
          {
            ...validBaseQuiz.questions[0],
          },
        ],
      }),
    ).toMatchInlineSnapshot(`
"Quiz JSON is invalid. Please revise it to satisfy the Quiz Object Standard.

1. Path: \`questions[0].options\`
   Problem: A single-choice Question must have exactly one correct Option.
   Fix: Set the required correct Options: exactly one for \`single-choice\`, at least one for \`multiple-choice\`.
2. Path: \`questions[1].id\`
   Problem: Question id "first-question" must be unique within the Quiz.
   Fix: Give each Question a unique \`id\` within this Quiz."
`);
  });

  test("formats an `http://` image source", () => {
    expect(
      reportForQuestionMedia({
        images: [{ src: "http://example.com/diagram.png", alt: "A diagram" }],
      }),
    ).toMatchInlineSnapshot(`
      "Quiz JSON is invalid. Please revise it to satisfy the Quiz Object Standard.

      1. Path: \`questions[0].images[0].src\`
         Problem: Use \`https\`, not \`http\`.
         Fix: Use a bare asset filename such as \`cache-tiers.svg\`, or an \`https://\` URL. \`http://\`, protocol-relative, and \`data:\` sources are not accepted."
    `);
  });

  test("formats an otherwise unusable image source", () => {
    expect(
      reportForQuestionMedia({
        images: [{ src: "diagrams/cache.svg", alt: "A diagram" }],
      }),
    ).toMatchInlineSnapshot(`
      "Quiz JSON is invalid. Please revise it to satisfy the Quiz Object Standard.

      1. Path: \`questions[0].images[0].src\`
         Problem: Use an \`https://\` URL or a bare asset filename (kebab-case name plus png/jpg/jpeg/webp/avif/gif/svg).
         Fix: Use a bare asset filename such as \`cache-tiers.svg\`, or an \`https://\` URL. \`http://\`, protocol-relative, and \`data:\` sources are not accepted."
    `);
  });

  test("formats a missing image `alt`", () => {
    expect(reportForQuestionMedia({ images: [{ src: "diagram.svg" }] })).toMatchInlineSnapshot(`
      "Quiz JSON is invalid. Please revise it to satisfy the Quiz Object Standard.

      1. Path: \`questions[0].images[0].alt\`
         Problem: Required field is missing.
         Fix: Add this required field using the shape defined by the Standard."
    `);
  });

  test("formats an empty media array", () => {
    expect(reportForQuestionMedia({ images: [], videos: [] })).toMatchInlineSnapshot(`
      "Quiz JSON is invalid. Please revise it to satisfy the Quiz Object Standard.

      1. Path: \`questions[0].images\`
         Problem: Add at least one image, or remove the empty \`images\` array.
         Fix: Both media fields are optional; omit the field instead of leaving it empty.
      2. Path: \`questions[0].videos\`
         Problem: Add at least one video, or remove the empty \`videos\` array.
         Fix: Both media fields are optional; omit the field instead of leaving it empty."
    `);
  });

  test("formats a bad `placement`", () => {
    expect(
      reportForQuestionMedia({
        images: [{ src: "diagram.svg", alt: "A diagram", placement: "explanation-top" }],
      }),
    ).toMatchInlineSnapshot(`
      "Quiz JSON is invalid. Please revise it to satisfy the Quiz Object Standard.

      1. Path: \`questions[0].images[0].placement\`
         Problem: Set \`placement\` to \`question\` or \`explanation\`.
         Fix: Use \`question\` or \`explanation\`, or omit \`placement\` entirely — an absent \`placement\` already means \`question\`."
    `);
  });

  test("formats a video URL used as a video id", () => {
    expect(
      reportForQuestionMedia({
        videos: [{ provider: "youtube", id: "https://www.youtube.com/watch?v=dQw4w9WgXcQ" }],
      }),
    ).toMatchInlineSnapshot(`
      "Quiz JSON is invalid. Please revise it to satisfy the Quiz Object Standard.

      1. Path: \`questions[0].videos[0].id\`
         Problem: Use the 11-character YouTube video id (for example \`dQw4w9WgXcQ\`), not a URL.
         Fix: Take the 11 characters after \`v=\` or \`youtu.be/\` in the video URL and use those alone."
    `);
  });

  test("formats an unknown video provider", () => {
    expect(reportForQuestionMedia({ videos: [{ provider: "vimeo", id: "dQw4w9WgXcQ" }] }))
      .toMatchInlineSnapshot(`
      "Quiz JSON is invalid. Please revise it to satisfy the Quiz Object Standard.

      1. Path: \`questions[0].videos[0].provider\`
         Problem: Set \`provider\` to \`youtube\`.
         Fix: \`youtube\` is the only video provider in version 1."
    `);
  });

  test("formats a negative video `start`", () => {
    expect(
      reportForQuestionMedia({ videos: [{ provider: "youtube", id: "dQw4w9WgXcQ", start: -5 }] }),
    ).toMatchInlineSnapshot(`
      "Quiz JSON is invalid. Please revise it to satisfy the Quiz Object Standard.

      1. Path: \`questions[0].videos[0].start\`
         Problem: Use a whole number of seconds, 0 or greater.
         Fix: Use a whole number of seconds, such as \`90\` for one minute thirty."
    `);
  });
});
