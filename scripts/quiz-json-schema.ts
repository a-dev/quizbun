import { z } from "zod";

import { quizSchema } from "../src/shared/lib/quiz/schema";

type JsonSchemaObject = Record<string, unknown>;

/**
 * The committed JSON Schema artifact, resolved relative to this module so the
 * generator and the drift checker can never disagree on where it lives.
 */
export const SCHEMA_ARTIFACT_URL = new URL("../public/schema/quiz.v1.json", import.meta.url);

const finalAuthorityNote =
  "JSON Schema cannot enforce this cross-field rule; the Zod validator and import page are the final authority.";

export function createQuizJsonSchema() {
  const schema = asObject(z.toJSONSchema(quizSchema), "root schema");

  schema.title = "Quiz Object Standard v1";
  schema.description = [
    "The published JSON Schema artifact for Quizbun's Quiz Object Standard v1.",
    "This artifact is generated from the Zod schema; the Zod validator and import page are the final authority.",
  ].join(" ");

  // `tags` defaults to `[]` in the Zod schema, so `z.toJSONSchema()` emits it
  // as a required key. Authors may omit tags under the base Standard (only the
  // Public catalog profile requires ≥1), so drop it from `required` here.
  removeRequiredField(schema, "tags");
  addCrossFieldAnnotations(schema);

  return schema;
}

export function serializeQuizJsonSchema() {
  return `${JSON.stringify(createQuizJsonSchema(), null, 2)}\n`;
}

function addCrossFieldAnnotations(schema: JsonSchemaObject) {
  const properties = asObject(schema.properties, "root properties");
  const questions = asObject(properties.questions, "questions schema");
  const questionItems = asObject(questions.items, "question items schema");
  const variants = asArray(questionItems.oneOf, "question variants").map((variant, index) =>
    asObject(variant, `question variant ${index}`),
  );

  appendDescription(
    questions,
    `Question ids must be unique within the Quiz. ${finalAuthorityNote}`,
  );

  for (const variant of variants) {
    const variantProperties = asObject(variant.properties, "question variant properties");
    const type = asObject(variantProperties.type, "question type schema");

    if (type.const === "single-choice") {
      appendDescription(
        variant,
        `A single-choice Question must have exactly one Option where \`isCorrect\` is true. ${finalAuthorityNote}`,
      );
      appendDescription(
        asObject(variantProperties.options, "single-choice options schema"),
        `Exactly one Option in this array must have \`isCorrect: true\`. ${finalAuthorityNote}`,
      );
    }

    if (type.const === "multiple-choice") {
      appendDescription(
        variant,
        `A multiple-choice Question must have at least one Option where \`isCorrect\` is true. All Options may be correct. ${finalAuthorityNote}`,
      );
      appendDescription(
        asObject(variantProperties.options, "multiple-choice options schema"),
        `At least one Option in this array must have \`isCorrect: true\`. All Options may be correct. ${finalAuthorityNote}`,
      );
    }
  }
}

function appendDescription(schema: JsonSchemaObject, description: string) {
  schema.description =
    typeof schema.description === "string" && schema.description.length > 0
      ? `${schema.description} ${description}`
      : description;
}

function removeRequiredField(schema: JsonSchemaObject, fieldName: string) {
  const requiredFields = asArray(schema.required, "required fields");
  schema.required = requiredFields.filter((field) => field !== fieldName);
}

function asObject(value: unknown, context: string) {
  if (value !== null && typeof value === "object" && !Array.isArray(value)) {
    return value as JsonSchemaObject;
  }

  throw new TypeError(`Expected ${context} to be an object.`);
}

function asArray(value: unknown, context: string) {
  if (Array.isArray(value)) {
    return value;
  }

  throw new TypeError(`Expected ${context} to be an array.`);
}
