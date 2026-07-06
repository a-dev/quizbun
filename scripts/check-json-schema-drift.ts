import { readFile } from "node:fs/promises";

import { SCHEMA_ARTIFACT_URL, serializeQuizJsonSchema } from "./quiz-json-schema";

const expected = serializeQuizJsonSchema();

let actual: string;

try {
  actual = await readFile(SCHEMA_ARTIFACT_URL, "utf8");
} catch (error) {
  console.error("JSON Schema artifact is missing.");
  console.error("Run `bun run schema:generate` to create public/schema/quiz.v1.json.");
  throw error;
}

if (actual !== expected) {
  console.error("JSON Schema artifact is out of date.");
  console.error("Run `bun run schema:generate` and commit public/schema/quiz.v1.json.");
  console.error(`First difference around line ${findFirstDriftedLine(expected, actual)}.`);
  process.exitCode = 1;
}

/**
 * Returns a 1-based line number pointing at the first divergence, so a failing
 * CI log can lead straight to the offending line. When one file is merely a
 * prefix of the other (no differing line), the divergence is the first missing
 * line, i.e. one past the shorter file.
 */
function findFirstDriftedLine(expected: string, actual: string): number {
  const expectedLines = expected.split("\n");
  const actualLines = actual.split("\n");
  const firstDifferentIndex = expectedLines.findIndex((line, index) => line !== actualLines[index]);

  return firstDifferentIndex === -1
    ? Math.min(actualLines.length, expectedLines.length)
    : firstDifferentIndex + 1;
}
