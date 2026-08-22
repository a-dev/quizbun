import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { basename, extname, relative, resolve } from "node:path";

import {
  formatQuizValidationErrors,
  parseQuizJson,
  type Quiz,
  quizSchema,
} from "../src/shared/lib/quiz";

/**
 * Standard-level validation mechanics shared by the CI gates
 * (`validate-doc-examples.ts`, `validate-public-quizzes.ts`) and the standalone
 * validator bundled into the `create-quiz` skill. Each caller keeps its own
 * framing, exit behaviour, and contributor hints.
 *
 * Deliberately imports nothing but the schema: the Public catalog profile lives
 * in `catalog-profile-validation.ts` because it pulls in the Markdown renderer,
 * and `sanitize-html` (CommonJS) requires the ESM-only `htmlparser2`, which Bun
 * refuses to load from some entry graphs. Keep this module renderer-free.
 */

/** One Quiz plus the label every error report uses to point back at its file. */
export interface LabelledQuiz {
  fileLabel: string;
  quiz: Quiz;
}

export function toPathLabel(filePath: string): string {
  return relative(process.cwd(), filePath) || basename(filePath);
}

/**
 * Resolves a validation target to the Quiz files it names. Directory entries are
 * sorted so the reported count and any failure are deterministic. The walk is
 * shallow: a subdirectory of `content/quizzes/` is an Asset folder, never a Quiz.
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
 * Reads and validates each file against the Standard, failing on the first
 * invalid file: that path-precise report is the one an author pastes back into
 * an AI chat, so collecting every failure first adds nothing.
 */
export function readQuizFiles(filePaths: string[]): LabelledQuiz[] {
  return filePaths.map((filePath) => {
    const fileLabel = toPathLabel(filePath);

    return { fileLabel, quiz: parseAndValidateQuiz(readFileSync(filePath, "utf8"), fileLabel) };
  });
}
