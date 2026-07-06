import type { Quiz } from "../../src/shared/lib/quiz";

// Canonical Quiz fixtures reused across specs. Keep these valid against the
// Standard (src/shared/lib/quiz/schema.ts); a quiz that fails import is a bug
// in the fixture, not the app under test.

/** Minimal single-choice quiz — the simplest Library/Player journey. */
export const singleChoiceQuiz: Quiz = {
  schemaVersion: 1,
  id: "e2e-single-choice",
  title: "E2E — Single choice",
  description: "A one-question single-choice quiz for the player happy path.",
  language: "en",
  tags: ["e2e", "sample"],
  questions: [
    {
      id: "falsy-zero",
      type: "single-choice",
      title: "Which value is falsy in JavaScript?",
      explanation: "`0` is one of JavaScript's built-in falsy values.",
      options: [
        { text: "`[]`", isCorrect: false },
        { text: "`0`", isCorrect: true },
        { text: "`{}`", isCorrect: false },
      ],
    },
  ],
};

/** One quiz covering all three Question types — for the player matrix specs. */
export const mixedTypesQuiz: Quiz = {
  schemaVersion: 1,
  id: "e2e-mixed-types",
  title: "E2E — Mixed question types",
  description: "Choice, text input, and numeric input Questions in one Run.",
  language: "en",
  tags: ["e2e", "sample"],
  questions: [
    {
      id: "sc",
      type: "single-choice",
      title: "Pick the one correct option",
      explanation: "Because.",
      options: [
        { text: "Wrong", isCorrect: false },
        { text: "Right", isCorrect: true },
      ],
    },
    {
      id: "mc-partial",
      type: "multiple-choice",
      title: "Pick every correct option — partial attempt",
      explanation: "Multiple-choice is all-or-nothing, so a partial selection is incorrect.",
      options: [
        { text: "Yes", isCorrect: true },
        { text: "No", isCorrect: false },
        { text: "Also yes", isCorrect: true },
      ],
    },
    {
      id: "mc-complete",
      type: "multiple-choice",
      title: "Pick every correct option — complete attempt",
      explanation: "Selecting exactly the correct Option set is correct.",
      options: [
        { text: "Alpha", isCorrect: true },
        { text: "Beta", isCorrect: true },
        { text: "Gamma", isCorrect: false },
      ],
    },
    {
      id: "text",
      type: "input",
      title: "Type the answer",
      explanation: "Matched case-insensitively after trim.",
      validation: { mode: "text", acceptedAnswers: ["answer"] },
    },
    {
      id: "numeric-comma",
      type: "input",
      title: "Type a numeric answer with a comma decimal separator",
      explanation: "Numeric answers accept a comma as the decimal separator.",
      validation: { mode: "numeric", acceptedAnswers: [12.5], tolerance: 0.1 },
    },
    {
      id: "numeric-outside-tolerance",
      type: "input",
      title: "Type a numeric answer outside tolerance",
      explanation: "Numeric answers outside the configured tolerance are incorrect.",
      validation: { mode: "numeric", acceptedAnswers: [10], tolerance: 0.25 },
    },
  ],
};

/** Two-question quiz for proving Content hash reconciliation keeps only unchanged progress. */
export const contentHashQuiz: Quiz = {
  schemaVersion: 1,
  id: "e2e-content-hash",
  title: "E2E — Content hash",
  description: "A quiz with one stable Question and one edited Question.",
  language: "en",
  tags: ["e2e", "sample"],
  questions: [
    {
      id: "stable-question",
      type: "single-choice",
      title: "Which letter comes first?",
      explanation: "A comes before B in the English alphabet.",
      options: [
        { text: "A", isCorrect: true },
        { text: "B", isCorrect: false },
      ],
    },
    {
      id: "edited-question",
      type: "single-choice",
      title: "Which letter comes second?",
      explanation: "B comes after A in the English alphabet.",
      options: [
        { text: "A", isCorrect: false },
        { text: "B", isCorrect: true },
      ],
    },
  ],
};

export const changedContentHashQuiz: Quiz = {
  ...contentHashQuiz,
  questions: [
    contentHashQuiz.questions[0]!,
    {
      ...contentHashQuiz.questions[1]!,
      title: "Which letter follows A?",
      explanation: "B follows A, so progress for this edited Question is invalidated.",
    },
  ],
};
