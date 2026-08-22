import { resolve } from "node:path";

import { loadPublicQuizzes, PUBLIC_QUIZZES_DIR } from "../src/shared/lib/content";

import { checkCatalogQuizzes, formatCatalogProfileSummary, toPathLabel } from "./quiz-validation";

/**
 * CI gate for contributor PRs: validates every public Quiz against the
 * Standard (via the loader — invalid files, duplicate ids, and filename ≠ id
 * throw there) and then against the Public catalog profile. Errors fail the
 * run; warnings print but pass. The profile mechanics are shared with the
 * `create-quiz` skill's standalone validator (see `quiz-validation.ts`); what
 * belongs to CI alone is the contributor-guide hint below.
 */

// T5.3: a rejected contributor must land on the page that explains what to
// do with this report — the round-trip section of the contributor guide.
const CONTRIBUTOR_GUIDE_HINT =
  "\nHow to fix this (and how to paste the report back into an AI chat):\n" +
  "https://a-dev.github.io/quizbun/docs/contributing/#the-error-message-round-trip";

// Stays exactly as given: the loader dates Quizzes from `git log` output, whose
// paths are repo-relative, so an absolute directory would match nothing there.
const contentDir = process.argv[2] ?? PUBLIC_QUIZZES_DIR;

try {
  const catalog = loadPublicQuizzes(contentDir);
  const report = checkCatalogQuizzes(catalog.quizzes, resolve(process.cwd(), contentDir));
  const summary = formatCatalogProfileSummary(
    report,
    toPathLabel(resolve(process.cwd(), contentDir)),
  );

  for (const quizReport of report.reports) {
    console.error(`${quizReport}\n`);
  }

  if (report.errorCount > 0) {
    console.error(`${summary}${CONTRIBUTOR_GUIDE_HINT}`);
    process.exitCode = 1;
  } else {
    console.log(summary);
  }
} catch (error) {
  console.error(
    `${error instanceof Error ? error.message : String(error)}${CONTRIBUTOR_GUIDE_HINT}`,
  );
  process.exitCode = 1;
}
