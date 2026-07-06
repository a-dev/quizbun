import { z } from "zod";

const idPattern = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const languagePattern = /^[a-zA-Z]{2,3}(?:-[a-zA-Z0-9]{2,8})*$/;

function strictObject<Shape extends z.ZodRawShape>(shape: Shape) {
  return z.object(shape).strict();
}

function requiredString() {
  return z.string({
    error: (issue) =>
      issue.input === undefined ? "Required field missing." : "Expected a string.",
  });
}

function requiredArray<Item extends z.ZodType>(itemSchema: Item) {
  return z.array(itemSchema, {
    error: (issue) =>
      issue.input === undefined ? "Required field missing." : "Expected an array.",
  });
}

function requiredBoolean() {
  return z.boolean({
    error: (issue) =>
      issue.input === undefined
        ? "Required field missing."
        : "Expected a boolean (`true` or `false`).",
  });
}

function requiredNumber() {
  return z.number({
    error: (issue) =>
      issue.input === undefined ? "Required field missing." : "Expected a number.",
  });
}

const nonEmptyStringSchema = requiredString().refine(
  (value) => value.trim().length > 0,
  "Use a non-empty string.",
);

const idSchema = nonEmptyStringSchema.regex(
  idPattern,
  "Use kebab-case with lowercase latin letters, digits, and single hyphens.",
);

const tagSchema = idSchema;

export const optionSchema = strictObject({
  text: nonEmptyStringSchema,
  isCorrect: requiredBoolean(),
});

const choiceOptionsSchema = requiredArray(optionSchema).min(2, "Add at least two Options.");

const baseQuestionFields = {
  id: idSchema,
  title: nonEmptyStringSchema,
  description: nonEmptyStringSchema.optional(),
  explanation: nonEmptyStringSchema,
  references: nonEmptyStringSchema.optional(),
};

export const singleChoiceQuestionSchema = strictObject({
  ...baseQuestionFields,
  type: z.literal("single-choice"),
  options: choiceOptionsSchema,
}).superRefine((question, context) => {
  const correctOptionsCount = question.options.filter((option) => option.isCorrect).length;

  if (correctOptionsCount !== 1) {
    context.addIssue({
      code: "custom",
      message: "A single-choice Question must have exactly one correct Option.",
      path: ["options"],
    });
  }
});

export const multipleChoiceQuestionSchema = strictObject({
  ...baseQuestionFields,
  type: z.literal("multiple-choice"),
  options: choiceOptionsSchema,
}).superRefine((question, context) => {
  const correctOptionsCount = question.options.filter((option) => option.isCorrect).length;

  if (correctOptionsCount < 1) {
    context.addIssue({
      code: "custom",
      message: "A multiple-choice Question must have at least one correct Option.",
      path: ["options"],
    });
  }
});

export const textInputValidationSchema = strictObject({
  mode: z.literal("text"),
  acceptedAnswers: requiredArray(nonEmptyStringSchema).min(1, "Add at least one Accepted answer."),
  caseSensitive: requiredBoolean().optional(),
});

export const numericInputValidationSchema = strictObject({
  mode: z.literal("numeric"),
  acceptedAnswers: requiredArray(requiredNumber().finite("Expected a finite number.")).min(
    1,
    "Add at least one Accepted answer.",
  ),
  tolerance: requiredNumber()
    .finite("Expected a finite number.")
    .min(0, "Use a number greater than or equal to 0.")
    .optional(),
});

export const inputValidationSchema = z.discriminatedUnion(
  "mode",
  [textInputValidationSchema, numericInputValidationSchema],
  {
    error: "Set `mode` to `text` or `numeric`.",
  },
);

export const inputQuestionSchema = strictObject({
  ...baseQuestionFields,
  type: z.literal("input"),
  validation: inputValidationSchema,
});

export const questionSchema = z.discriminatedUnion(
  "type",
  [singleChoiceQuestionSchema, multipleChoiceQuestionSchema, inputQuestionSchema],
  {
    error: "Set `type` to `single-choice`, `multiple-choice`, or `input`.",
  },
);

export const quizSchema = strictObject({
  schemaVersion: z.literal(1, {
    error: "Set `schemaVersion` to the integer `1`.",
  }),
  id: idSchema,
  title: nonEmptyStringSchema,
  description: nonEmptyStringSchema.optional(),
  language: requiredString()
    .regex(languagePattern, "Use a BCP-47 language tag such as `en` or `en-US`.")
    .optional(),
  tags: requiredArray(tagSchema).default([]),
  author: nonEmptyStringSchema.optional(),
  questions: requiredArray(questionSchema).min(1, "Add at least one Question."),
}).superRefine((quiz, context) => {
  const seenQuestionIds = new Set<string>();

  for (const [index, question] of quiz.questions.entries()) {
    if (seenQuestionIds.has(question.id)) {
      context.addIssue({
        code: "custom",
        message: `Question id "${question.id}" must be unique within the Quiz.`,
        path: ["questions", index, "id"],
      });
    }

    seenQuestionIds.add(question.id);
  }
});

export type Option = z.infer<typeof optionSchema>;
export type SingleChoiceQuestion = z.infer<typeof singleChoiceQuestionSchema>;
export type MultipleChoiceQuestion = z.infer<typeof multipleChoiceQuestionSchema>;
export type TextInputValidation = z.infer<typeof textInputValidationSchema>;
export type NumericInputValidation = z.infer<typeof numericInputValidationSchema>;
export type InputValidation = z.infer<typeof inputValidationSchema>;
export type InputQuestion = z.infer<typeof inputQuestionSchema>;
export type Question = z.infer<typeof questionSchema>;
export type Quiz = z.infer<typeof quizSchema>;
