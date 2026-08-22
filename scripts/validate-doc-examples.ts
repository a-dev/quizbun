import { resolve } from "node:path";

import { collectJsonFiles, readQuizFiles, toPathLabel } from "./quiz-validation";

/**
 * CI gate for the canonical examples in `docs/examples/`: every file an author
 * is told to copy must validate against the Standard. Base Standard only — the
 * Public catalog profile does not apply to docs examples.
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
