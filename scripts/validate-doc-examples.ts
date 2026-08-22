import { resolve } from "node:path";

import { collectJsonFiles, readQuizFiles, toPathLabel } from "./quiz-validation";

/**
 * CI gate for the canonical examples in `docs/examples/`: every file an author
 * is told to copy must validate against the Standard. The mechanics are shared
 * with the other gates and the `create-quiz` skill (see `quiz-validation.ts`).
 */

const targetPath = resolve(process.cwd(), process.argv[2] ?? "docs/examples");

try {
  const filePaths = collectJsonFiles(targetPath);

  if (filePaths.length === 0) {
    throw new Error(`No docs example JSON files found in ${toPathLabel(targetPath)}.`);
  }

  readQuizFiles(filePaths);

  console.log(
    `Validated ${filePaths.length} docs example Quiz file(s) from ${toPathLabel(targetPath)}.`,
  );
} catch (error) {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
}
