import { z } from "zod";

export const ID_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const languagePattern = /^[a-zA-Z]{2,3}(?:-[a-zA-Z0-9]{2,8})*$/;

/** A bare asset filename: kebab-case basename plus an allowlisted extension, no directories. */
export const ASSET_FILE_NAME_PATTERN =
  /^[a-z0-9]+(?:-[a-z0-9]+)*\.(?:png|jpe?g|webp|avif|gif|svg)$/;
const remoteImageSrcPattern = /^https:\/\/\S+$/;
const youtubeVideoIdPattern = /^[A-Za-z0-9_-]{11}$/;

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
  ID_PATTERN,
  "Use kebab-case with lowercase latin letters, digits, and single hyphens.",
);

const tagSchema = idSchema;

export const optionSchema = strictObject({
  text: nonEmptyStringSchema,
  isCorrect: requiredBoolean(),
});

const choiceOptionsSchema = requiredArray(optionSchema).min(2, "Add at least two Options.");

const placementSchema = z.enum(["question", "explanation"], {
  error: "Set `placement` to `question` or `explanation`.",
});

// Two regex branches rather than one `superRefine`, so both patterns survive
// `z.toJSONSchema()` into the published artifact. Absent `placement` means
// `question`; the Renderer resolves that, so no `.default()` appears here and a
// parsed Quiz never gains a field its author did not write.
const imageSrcSchema = z.union(
  [
    nonEmptyStringSchema.regex(ASSET_FILE_NAME_PATTERN),
    nonEmptyStringSchema.regex(remoteImageSrcPattern),
  ],
  {
    error: (issue) => {
      // A union reports an absent value as a failed union rather than a missing
      // field, so it has to say so itself or the formatter answers "your `src`
      // is malformed" to an author who simply forgot to write one.
      if (issue.input === undefined) return "Required field missing.";

      return typeof issue.input === "string" && issue.input.startsWith("http://")
        ? "Use `https`, not `http`."
        : "Use an `https://` URL or a bare asset filename (kebab-case name plus png/jpg/jpeg/webp/avif/gif/svg).";
    },
  },
);

// Intrinsic pixel size of the file `src` points at, so a Renderer can reserve
// the box before the image decodes. A fact about the referenced resource, like
// `alt`; the displayed size stays Renderer behavior.
const imageDimensionSchema = requiredNumber()
  .int("Use a whole number of pixels, 1 or greater.")
  .min(1, "Use a whole number of pixels, 1 or greater.");

export const imageSchema = strictObject({
  src: imageSrcSchema,
  alt: nonEmptyStringSchema,
  caption: nonEmptyStringSchema.optional(),
  placement: placementSchema.optional(),
  width: imageDimensionSchema.optional(),
  height: imageDimensionSchema.optional(),
}).superRefine((image, context) => {
  // Both or neither. A lone dimension reserves nothing, so it is dead weight in
  // the Quiz and a silent no-op in the Renderer; better to say so at import.
  if ((image.width === undefined) === (image.height === undefined)) return;

  const missingField = image.width === undefined ? "width" : "height";

  context.addIssue({
    code: "custom",
    message: `Set \`width\` and \`height\` together, or omit both. \`${missingField}\` is missing.`,
    path: [missingField],
  });
});

export const videoSchema = strictObject({
  provider: z.literal("youtube", { error: "Set `provider` to `youtube`." }),
  id: nonEmptyStringSchema.regex(
    youtubeVideoIdPattern,
    "Use the 11-character YouTube video id (for example `dQw4w9WgXcQ`), not a URL.",
  ),
  start: requiredNumber()
    .int("Use a whole number of seconds, 0 or greater.")
    .min(0, "Use a whole number of seconds, 0 or greater.")
    .optional(),
  placement: placementSchema.optional(),
});

const baseQuestionFields = {
  id: idSchema,
  title: nonEmptyStringSchema,
  description: nonEmptyStringSchema.optional(),
  explanation: nonEmptyStringSchema,
  references: nonEmptyStringSchema.optional(),
  images: requiredArray(imageSchema)
    .min(1, "Add at least one image, or remove the empty `images` array.")
    .optional(),
  videos: requiredArray(videoSchema)
    .min(1, "Add at least one video, or remove the empty `videos` array.")
    .optional(),
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

export type Image = z.infer<typeof imageSchema>;
export type Video = z.infer<typeof videoSchema>;
export type MediaPlacement = z.infer<typeof placementSchema>;
export type Option = z.infer<typeof optionSchema>;
export type SingleChoiceQuestion = z.infer<typeof singleChoiceQuestionSchema>;
export type MultipleChoiceQuestion = z.infer<typeof multipleChoiceQuestionSchema>;
export type TextInputValidation = z.infer<typeof textInputValidationSchema>;
export type NumericInputValidation = z.infer<typeof numericInputValidationSchema>;
export type InputValidation = z.infer<typeof inputValidationSchema>;
export type InputQuestion = z.infer<typeof inputQuestionSchema>;
export type Question = z.infer<typeof questionSchema>;
export type Quiz = z.infer<typeof quizSchema>;
