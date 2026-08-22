import { resolve } from "node:path";

import { checkCatalogProfile, formatProfileIssues } from "../src/shared/lib/content";
import type { Quiz } from "../src/shared/lib/quiz";

import { toPathLabel } from "./quiz-validation";

/**
 * The Public catalog profile half of the validation gates, kept apart from
 * `quiz-validation.ts` because the profile's Markdown/sanitization audit drags
 * in the renderer (and with it `sanitize-html`). Gates that only check the
 * Standard must not pay for that — see the note in `quiz-validation.ts`.
 */

export interface CatalogProfileReport {
  errorCount: number;
  quizCount: number;
  /** One formatted report per Quiz that has at least one issue. */
  reports: string[];
  warningCount: number;
}

/** Applies the profile to already-validated Quizzes; errors fail a gate, warnings only print. */
export function checkCatalogQuizzes(quizzes: Quiz[], directoryPath: string): CatalogProfileReport {
  const reports: string[] = [];
  let errorCount = 0;
  let warningCount = 0;

  for (const quiz of quizzes) {
    const issues = checkCatalogProfile(quiz);

    if (issues.length === 0) continue;

    reports.push(
      formatProfileIssues(toPathLabel(resolve(directoryPath, `${quiz.id}.json`)), issues),
    );

    for (const issue of issues) {
      if (issue.severity === "error") {
        errorCount += 1;
      } else {
        warningCount += 1;
      }
    }
  }

  return { errorCount, quizCount: quizzes.length, reports, warningCount };
}

/** The one-line verdict every Public catalog profile run ends with. */
export function formatCatalogProfileSummary(
  report: CatalogProfileReport,
  targetLabel: string,
): string {
  return report.errorCount > 0
    ? `Public catalog profile check failed: ${report.errorCount} error(s), ${report.warningCount} warning(s) across ${report.quizCount} Quiz file(s) in ${targetLabel}.`
    : `Validated ${report.quizCount} public Quiz file(s) from ${targetLabel} against the Public catalog profile (${report.warningCount} warning(s)).`;
}
