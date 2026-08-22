import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { basename, extname, relative, resolve } from "node:path";

import { checkCatalogProfile, formatProfileIssues } from "../src/shared/lib/content";
import {
  formatQuizValidationErrors,
  parseQuizJson,
  type Quiz,
  quizSchema,
} from "../src/shared/lib/quiz";

/**
 * Validation mechanics shared by the repository CI gates
 * (`validate-doc-examples.ts`, `validate-public-quizzes.ts`) and by the
 * standalone validator bundled into the `create-quiz` skill
 * (`create-quiz-validator.ts`). Only the file walking, the Standard parse, and
 * the Public catalog profile tally live here; each caller keeps its own
 * framing, exit behaviour, and contributor hints.
 */

/** One Quiz plus the label every error report uses to point back at its file. */
export interface LabelledQuiz {
  fileLabel: string;
  quiz: Quiz;
}

export interface CatalogProfileReport {
  errorCount: number;
  quizCount: number;
  /** One formatted report per Quiz that has at least one issue. */
  reports: string[];
  warningCount: number;
}

export function toPathLabel(filePath: string): string {
  return relative(process.cwd(), filePath) || basename(filePath);
}

/**
 * Resolves a validation target to the Quiz files it names. A directory target
 * takes every `*.json` entry in stable, locale-aware order so the reported file
 * count and any failure are deterministic. The walk is deliberately shallow: a
 * subdirectory of `content/quizzes/` is an Asset folder, never a Quiz.
 */
export function collectJsonFiles(targetPath: string): string[] {
  if (!existsSync(targetPath)) {
    throw new Error(`Validation target does not exist: ${toPathLabel(targetPath)}.`);
  }

  const stats = statSync(targetPath);

  if (stats.isDirectory()) {
    return readdirSync(targetPath)
      .filter((entryName) => entryName.endsWith(".json"))
      .sort((left, right) => left.localeCompare(right, "en"))
      .map((entryName) => resolve(targetPath, entryName));
  }

  if (stats.isFile() && extname(targetPath) === ".json") {
    return [targetPath];
  }

  throw new Error(
    `Validation target must be a JSON file or directory. Received: ${toPathLabel(targetPath)}.`,
  );
}

export function parseAndValidateQuiz(rawText: string, sourceLabel: string): Quiz {
  const quizJson = parseQuizJson(rawText, sourceLabel);
  const result = quizSchema.safeParse(quizJson);

  if (!result.success) {
    throw new Error(
      [`Quiz validation failed in ${sourceLabel}:`, formatQuizValidationErrors(result.error)].join(
        "\n",
      ),
    );
  }

  return result.data;
}

/**
 * Reads and validates each file against the Standard. Fails fast on the first
 * invalid file: the first path-precise report is the one an author pastes back
 * into an AI chat, so collecting every failure first adds nothing.
 */
export function readQuizFiles(filePaths: string[]): LabelledQuiz[] {
  return filePaths.map((filePath) => {
    const fileLabel = toPathLabel(filePath);

    return { fileLabel, quiz: parseAndValidateQuiz(readFileSync(filePath, "utf8"), fileLabel) };
  });
}

/**
 * Applies the Public catalog profile to already-validated Quizzes and tallies
 * severities in one pass. Severity is exactly "error" | "warning" (see
 * ProfileIssue): errors fail a gate, warnings only print.
 */
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
