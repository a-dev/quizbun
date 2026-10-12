/**
 * The Import limits: the largest Quiz Quizbun, as a Renderer, imports. They
 * belong to this site, not to the Quiz Object Standard: another Renderer may
 * accept larger Quizzes, and the Standard stays at `schemaVersion: 1`. Keep
 * both constants together and change them with the docs.
 */
export const MAX_IMPORT_QUESTIONS = 200;
export const MAX_IMPORT_BYTES = 1_048_576;

const LIMIT_PREAMBLE = "This is a Quizbun limit, not a Standard error.";

/**
 * The report for a Quiz text over `MAX_IMPORT_BYTES`; shared by paste, file and
 * link. A link decoder stops reading at the limit, so it passes no size.
 */
export function formatImportSizeReport(actualBytes?: number): string {
  const size = actualBytes === undefined ? "over 1 MB" : formatMegabytes(actualBytes);

  return formatLimitReport({
    path: "root",
    problem: `the Quiz JSON is ${size}; Quizbun imports up to ${formatMegabytes(MAX_IMPORT_BYTES)}`,
    fix: "split the Quiz into smaller Quizzes or shorten long Explanations.",
  });
}

export function formatImportQuestionCountReport(count: number): string {
  return formatLimitReport({
    path: "questions",
    problem: `${count} Questions; Quizbun imports up to ${MAX_IMPORT_QUESTIONS}`,
    fix: "split the Quiz into two or more Quizzes, for example by subtopic.",
  });
}

/** Measures the UTF-8 bytes of the text Import received, before it is parsed. */
export function checkImportSize(text: string): string | undefined {
  // A UTF-8 byte is at least one UTF-16 code unit, and at most three per unit,
  // so only text in the ambiguous band needs the real encoder.
  if (text.length > MAX_IMPORT_BYTES) return formatImportSizeReport(utf8ByteLength(text));
  if (text.length * 3 <= MAX_IMPORT_BYTES) return undefined;

  const bytes = utf8ByteLength(text);

  return bytes > MAX_IMPORT_BYTES ? formatImportSizeReport(bytes) : undefined;
}

/** Runs on parsed JSON, before schema validation, so a huge Quiz skips full validation. */
export function checkImportQuestionCount(quiz: unknown): string | undefined {
  if (typeof quiz !== "object" || quiz === null || !("questions" in quiz)) return undefined;

  const { questions } = quiz;

  if (!Array.isArray(questions) || questions.length <= MAX_IMPORT_QUESTIONS) return undefined;

  return formatImportQuestionCountReport(questions.length);
}

export function utf8ByteLength(text: string): number {
  return new TextEncoder().encode(text).byteLength;
}

function formatLimitReport(report: { path: string; problem: string; fix: string }): string {
  return [
    LIMIT_PREAMBLE,
    "",
    `1. Path: \`${report.path}\``,
    `   Problem: ${report.problem}`,
    `   Fix: ${report.fix}`,
  ].join("\n");
}

function formatMegabytes(bytes: number): string {
  const megabytes = bytes / 1_048_576;

  return `${Number.isInteger(megabytes) ? megabytes : megabytes.toFixed(1)} MB`;
}
