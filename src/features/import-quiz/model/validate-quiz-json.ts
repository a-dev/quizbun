import { messageFromError } from "@/shared/lib/errors";
import { formatQuizValidationErrors, quizSchema } from "@/shared/lib/quiz";
import type { Quiz } from "@/shared/lib/quiz";

/**
 * Both failure kinds (JSON syntax, Standard violation) produce one copyable
 * `report` string: pasting it back into an AI chat is the repair loop.
 */
export type QuizJsonValidationResult =
  | { status: "valid"; quiz: Quiz }
  | { status: "invalid"; report: string };

export function validateQuizJson(text: string): QuizJsonValidationResult {
  let parsed: unknown;

  try {
    parsed = JSON.parse(text);
  } catch (error) {
    return { status: "invalid", report: formatJsonSyntaxError(text, error) };
  }

  const result = quizSchema.safeParse(parsed);

  if (!result.success) {
    return { status: "invalid", report: formatQuizValidationErrors(result.error) };
  }

  return { status: "valid", quiz: result.data };
}

function formatJsonSyntaxError(text: string, error: unknown): string {
  const message = messageFromError(error);
  const location = locateJsonError(text, message);

  return [
    "This is not valid JSON, so it cannot be checked against the Quiz Object Standard yet.",
    "",
    location === undefined
      ? `Problem: ${message}`
      : `Problem at line ${location.line}, column ${location.column}: ${message}`,
    "Fix: repair the JSON syntax (quotes, commas, brackets), then validate again.",
  ].join("\n");
}

function locateJsonError(text: string, message: string) {
  const lineColumnMatch = message.match(/line (\d+) column (\d+)/);

  if (lineColumnMatch) {
    return { line: Number(lineColumnMatch[1]), column: Number(lineColumnMatch[2]) };
  }

  const positionMatch = message.match(/position (\d+)/);

  if (!positionMatch) return undefined;

  const position = Math.min(Number(positionMatch[1]), text.length);
  const before = text.slice(0, position);
  const line = before.split("\n").length;
  const column = position - before.lastIndexOf("\n");

  return { line, column };
}
