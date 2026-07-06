import type { InputQuestion, Question } from "./schema";

/**
 * Answer matching per docs/standard.md ("Text matching rules", "Numeric
 * matching rules", "Correctness model"). Pure comparison: a submitted answer
 * references Option indexes in the original JSON order for choice Questions
 * and the raw input string for input Questions.
 */

/** Trim → collapse internal whitespace → NFC → optional case fold. */
function normalizeText(value: string, caseSensitive: boolean): string {
  const normalized = value.trim().replace(/\s+/g, " ").normalize("NFC");

  return caseSensitive ? normalized : normalized.toLowerCase();
}

/**
 * Parses a submitted numeric string: trimmed, `.` or `,` as the decimal
 * separator (never both, never thousands separators). Returns `undefined`
 * when the value is not a single finite number.
 */
export function parseNumericInput(raw: string): number | undefined {
  const trimmed = raw.trim();

  if (trimmed.includes(",") && trimmed.includes(".")) return undefined;

  const normalized = trimmed.replace(",", ".");

  if (!/^[+-]?(?:\d+(?:\.\d*)?|\.\d+)$/.test(normalized)) return undefined;

  const parsed = Number(normalized);

  return Number.isFinite(parsed) ? parsed : undefined;
}

function checkInputAnswer(question: InputQuestion, submitted: string): boolean {
  const { validation } = question;

  if (validation.mode === "text") {
    const caseSensitive = validation.caseSensitive ?? false;
    const normalized = normalizeText(submitted, caseSensitive);

    return validation.acceptedAnswers.some(
      (accepted) => normalizeText(accepted, caseSensitive) === normalized,
    );
  }

  const parsed = parseNumericInput(submitted);

  if (parsed === undefined) return false;

  const tolerance = validation.tolerance ?? 0;

  return validation.acceptedAnswers.some((accepted) => Math.abs(parsed - accepted) <= tolerance);
}

/**
 * Evaluates a submitted answer to the Standard's single binary result.
 * Multiple-choice is all-or-nothing: the selected index set must equal the
 * correct index set exactly.
 */
export function checkAnswer(question: Question, submitted: number | number[] | string): boolean {
  switch (question.type) {
    case "single-choice": {
      if (typeof submitted !== "number") return false;

      return question.options[submitted]?.isCorrect === true;
    }
    case "multiple-choice": {
      if (!Array.isArray(submitted)) return false;

      const selected = new Set(submitted);
      const correct = new Set(
        question.options.flatMap((option, index) => (option.isCorrect ? [index] : [])),
      );

      return selected.size === correct.size && [...correct].every((index) => selected.has(index));
    }
    case "input": {
      if (typeof submitted !== "string") return false;

      return checkInputAnswer(question, submitted);
    }
  }
}
