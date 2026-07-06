import {
  checkCatalogProfile,
  formatProfileIssues,
  loadPublicQuizzes,
  PUBLIC_QUIZZES_DIR,
} from "../src/shared/lib/content";

/**
 * CI gate for contributor PRs: validates every public quiz against the
 * Standard (via the loader — invalid files, duplicate ids, and filename ≠ id
 * throw there) and then against the Public catalog profile. Errors fail the
 * run; warnings print but pass.
 */

const contentDir = process.argv[2] ?? PUBLIC_QUIZZES_DIR;

// T5.3: a rejected contributor must land on the page that explains what to
// do with this report — the round-trip section of the contributor guide.
const CONTRIBUTOR_GUIDE_HINT =
  "\nHow to fix this (and how to paste the report back into an AI chat):\n" +
  "https://a-dev.github.io/quizbun/docs/contributing/#the-error-message-round-trip";

try {
  const catalog = loadPublicQuizzes(contentDir);
  let errorCount = 0;
  let warningCount = 0;

  for (const quiz of catalog.quizzes) {
    const issues = checkCatalogProfile(quiz);

    if (issues.length === 0) {
      continue;
    }

    const fileLabel = `${contentDir}/${quiz.id}.json`;
    console.error(`${formatProfileIssues(fileLabel, issues)}\n`);

    // Tally severities in one pass: errors fail the gate below, warnings only
    // print. Severity is exactly "error" | "warning" (see ProfileIssue).
    for (const issue of issues) {
      if (issue.severity === "error") {
        errorCount += 1;
      } else {
        warningCount += 1;
      }
    }
  }

  if (errorCount > 0) {
    console.error(
      `Public catalog profile check failed: ${errorCount} error(s), ${warningCount} warning(s) across ${catalog.quizzes.length} quiz file(s) in ${contentDir}.${CONTRIBUTOR_GUIDE_HINT}`,
    );
    process.exitCode = 1;
  } else {
    console.log(
      `Validated ${catalog.quizzes.length} public quiz file(s) from ${contentDir} against the Public catalog profile (${warningCount} warning(s)).`,
    );
  }
} catch (error) {
  console.error(
    `${error instanceof Error ? error.message : String(error)}${CONTRIBUTOR_GUIDE_HINT}`,
  );
  process.exitCode = 1;
}
