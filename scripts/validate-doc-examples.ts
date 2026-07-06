import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { basename, extname, relative, resolve } from "node:path";

import { formatQuizValidationErrors, parseQuizJson, quizSchema } from "../src/shared/lib/quiz";

type ValidationResult = {
  quizCount: number;
  targetLabel: string;
};

const defaultTargetPath = "docs/examples";

try {
  const result = validateDocExamples(process.argv[2] ?? defaultTargetPath);

  console.log(
    `Validated ${result.quizCount} docs example quiz file(s) from ${result.targetLabel}.`,
  );
} catch (error) {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
}

function validateDocExamples(targetArg: string): ValidationResult {
  const targetPath = resolve(process.cwd(), targetArg);
  const filePaths = collectJsonFiles(targetPath);

  if (filePaths.length === 0) {
    throw new Error(`No docs example JSON files found in ${toWorkspacePathLabel(targetPath)}.`);
  }

  // Fail fast on the first invalid file: in CI the first path-precise report is
  // the one the author pastes back into an AI chat, so there is no value in
  // collecting every failure before exiting.
  for (const filePath of filePaths) {
    const fileLabel = toWorkspacePathLabel(filePath);
    const quizJson = parseQuizJson(readFileSync(filePath, "utf8"), fileLabel);
    const result = quizSchema.safeParse(quizJson);

    if (!result.success) {
      throw new Error(
        [
          `Schema validation failed in ${fileLabel}:`,
          formatQuizValidationErrors(result.error),
        ].join("\n"),
      );
    }
  }

  return {
    quizCount: filePaths.length,
    targetLabel: toWorkspacePathLabel(targetPath),
  };
}

function collectJsonFiles(targetPath: string) {
  if (!existsSync(targetPath)) {
    throw new Error(`Validation target does not exist: ${toWorkspacePathLabel(targetPath)}.`);
  }

  const stats = statSync(targetPath);

  // A directory target validates every `*.json` entry in stable, locale-aware
  // order so the reported file count and any failure are deterministic.
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
    `Validation target must be a JSON file or directory. Received: ${toWorkspacePathLabel(
      targetPath,
    )}.`,
  );
}

function toWorkspacePathLabel(filePath: string) {
  return relative(process.cwd(), filePath) || basename(filePath);
}
