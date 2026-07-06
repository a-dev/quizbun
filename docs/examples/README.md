# Canonical Quiz Examples

These JSON files are the canonical v1 authoring surface for Quiz authors. Copy one of them instead of reverse-engineering the schema from runtime code.

The normative reference is [the Quiz Object Standard](../standard.md). Tooling can also consume the generated JSON Schema at `/schema/quiz.v1.json` after the site is built, or [the committed artifact](../../public/schema/quiz.v1.json) in this repository. Drafting with an AI tool? Keep this page open next to [quiz-generation-prompt.md](./quiz-generation-prompt.md).

## Copy order

1. Start with [public-quiz-single-choice.json](./public-quiz-single-choice.json) for the smallest valid public contribution path.
2. Move to [public-quiz-multiple-choice.json](./public-quiz-multiple-choice.json) when one question needs multiple correct options.
3. Use [public-quiz-input-text.json](./public-quiz-input-text.json) when learners should type a text answer. Text mode is case-insensitive, trimmed, and whitespace-collapsed by default.
4. Use [public-quiz-input-numeric.json](./public-quiz-input-numeric.json) when answers are numeric and rounded responses should still pass within a defined tolerance.

## What each example demonstrates

- [public-quiz-single-choice.json](./public-quiz-single-choice.json): stable quiz and question IDs, bare `{ "text", "isCorrect" }` options without labels, explanation-first feedback, and optional References in the simplest single-choice shape.
- [public-quiz-multiple-choice.json](./public-quiz-multiple-choice.json): multi-select structure with the all-or-nothing correctness model.
- [public-quiz-input-text.json](./public-quiz-input-text.json): text matching with the minimal zero-flag validation object, relying on the standard's hard defaults.
- [public-quiz-input-numeric.json](./public-quiz-input-numeric.json): numeric matching with an explicit tolerance value.
- [quiz-generation-prompt.md](./quiz-generation-prompt.md): a reusable prompt template for generating one strict JSON quiz object at a time.

## Validation

Run the docs example validator before changing these files:

```sh
bun run validate:docs-examples
```

To validate one file while editing:

```sh
bun run validate:docs-examples docs/examples/public-quiz-single-choice.json
```

The command imports the same Zod schema and formatter the import page uses. A failure names the file, the JSON path, the problem, and a concrete fix.
