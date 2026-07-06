import type { Quiz } from "./schema";

/**
 * Export downloads the bare Quiz exactly as imported — never the storage
 * envelope and never progress. Filename is `{quiz-id}.json` (ids are
 * kebab-case, so filesystem-safe).
 */
export function downloadQuizJson(quiz: Quiz): void {
  const json = JSON.stringify(quiz, null, 2);
  const url = URL.createObjectURL(new Blob([json], { type: "application/json" }));
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = `${quiz.id}.json`;
  anchor.click();
  URL.revokeObjectURL(url);
}
