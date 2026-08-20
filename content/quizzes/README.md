# Public quizzes

One JSON file per public Quiz, conforming to the Quiz Object Standard
(`/schema/quiz.v1.json`). The filename must equal the quiz `id`: `{id}.json`.

These files are the Catalog content source: the site build loads them through
`src/shared/lib/content/public-quizzes.ts`, and CI validates them against the
Public catalog profile on every PR. This directory is intentionally outside
`src/` (contributors never touch app code) and outside `public/` (raw files
are not shipped twice).

These files are Catalog **content**, not source code: `bun run check` does not
format them (`content/quizzes/**` is in `ignorePatterns` in `.oxfmtrc.json`), so
author formatting is preserved. The Standard cares about JSON content, not
whitespace — only `bun run validate:public-quizzes` gates what lands here.
