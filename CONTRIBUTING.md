# Contributing to Quizbun

The most valuable contribution is a quiz for the public Catalog. The complete walkthrough — generating a quiz with the published AI prompt, validating it locally, meeting the Public catalog profile, and reading CI feedback — lives in the published contributor guide:

**<https://a-dev.github.io/quizbun/docs/contributing/>**

(The same text is in this repo at [docs/contributing.md](docs/contributing.md) — the site page is rendered from it.)

The short version:

1. Generate or write a quiz that satisfies [the Quiz Object Standard](https://a-dev.github.io/quizbun/docs/standard/).
2. Validate it by pasting the JSON into the [import page](https://a-dev.github.io/quizbun/import/).
3. Add it as `content/quizzes/{id}.json` and open a pull request — one quiz (or one coherent cluster) per PR.

By submitting a public quiz, you license it under the repository's [MIT license](LICENSE); there is no per-quiz license field.

For code contributions, see [CLAUDE.md](CLAUDE.md) for the commands and architecture notes, and [CONTEXT.md](CONTEXT.md) for the vocabulary used across the codebase.
