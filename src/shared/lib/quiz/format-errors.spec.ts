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
});
