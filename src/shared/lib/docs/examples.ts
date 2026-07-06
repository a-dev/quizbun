import { readdirSync, readFileSync } from "node:fs";
import { resolve } from "node:path";

/**
 * Build-time loader for the canonical example quizzes (T3.3). The JSON files
 * and their one-line descriptions in `docs/examples/README.md` are the
 * single source of truth; the examples page renders what this module reads.
 */

export const DOC_EXAMPLES_DIR = "docs/examples";

export interface DocExample {
  /** File name inside `docs/examples/`, e.g. `public-quiz-single-choice.json`. */
  fileName: string;
  /** One-line "what it demonstrates" from the examples README. */
  description: string;
  /** Raw JSON source, byte-for-byte as committed. */
  json: string;
}

/**
 * Parses the `- [name.json](./name.json): description` bullets from the
 * "What each example demonstrates" list in the examples README.
 */
export function parseExampleDescriptions(readmeSource: string): Map<string, string> {
  const descriptions = new Map<string, string>();
  const bulletPattern = /^- \[([a-z0-9-]+\.json)\]\([^)]+\):\s*(.+)$/gm;

  for (const match of readmeSource.matchAll(bulletPattern)) {
    const [, fileName, description] = match;

    if (fileName !== undefined && description !== undefined) {
      descriptions.set(fileName, description.trim());
    }
  }

  return descriptions;
}

export function listDocExamples(examplesDir: string = DOC_EXAMPLES_DIR): DocExample[] {
  const directoryPath = resolve(process.cwd(), examplesDir);
  const readmeSource = readFileSync(resolve(directoryPath, "README.md"), "utf8");
  const descriptions = parseExampleDescriptions(readmeSource);

  return readdirSync(directoryPath)
    .filter((fileName) => fileName.endsWith(".json"))
    .sort((left, right) => left.localeCompare(right, "en"))
    .map((fileName) => {
      const description = descriptions.get(fileName);

      if (description === undefined) {
        throw new Error(
          `Example ${examplesDir}/${fileName} has no description bullet in ${examplesDir}/README.md.`,
        );
      }

      return {
        fileName,
        description,
        json: readFileSync(resolve(directoryPath, fileName), "utf8"),
      };
    });
}
