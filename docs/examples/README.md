# Canonical Quiz Examples

These JSON files are the canonical v1 authoring surface for Quiz authors. Copy one of them instead of reverse-engineering the schema from runtime code.

The normative reference is [the Quiz Object Standard](../standard.md). Tooling can also consume the generated JSON Schema at `/schema/quiz.v1.json` after the site is built, or [the committed artifact](../../public/schema/quiz.v1.json) in this repository. Drafting with an AI tool? Keep this page open next to the [AI generation page](../quiz-generation-prompt.md).

## Copy order

1. Start with [public-quiz-single-choice.json](./public-quiz-single-choice.json) for the smallest valid public contribution path.
2. Move to [public-quiz-multiple-choice.json](./public-quiz-multiple-choice.json) when one question needs multiple correct options.
3. Use [public-quiz-input-text.json](./public-quiz-input-text.json) when learners should type a text answer. Text mode is case-insensitive, trimmed, and whitespace-collapsed by default.
4. Use [public-quiz-input-numeric.json](./public-quiz-input-numeric.json) when answers are numeric and rounded responses should still pass within a defined tolerance.
5. Use [public-quiz-media.json](./public-quiz-media.json) when a Question needs structured Images or a Video.

## What each example demonstrates

- [public-quiz-single-choice.json](./public-quiz-single-choice.json): the smallest single-choice Quiz, with stable Quiz and Question IDs, unlabeled Options, Explanation-first feedback, and optional References.
- [public-quiz-multiple-choice.json](./public-quiz-multiple-choice.json): a Question with several correct Options. The learner must select every correct Option and no incorrect ones.
- [public-quiz-input-text.json](./public-quiz-input-text.json): the minimal text validation object. Matching ignores case and normalizes surrounding and repeated whitespace by default.
- [public-quiz-input-numeric.json](./public-quiz-input-numeric.json): a numeric answer checked with an explicit tolerance.
- [public-quiz-media.json](./public-quiz-media.json): bare Image filenames on both media surfaces, attribution in a caption, and a YouTube Video with a start time.
- [AI generation prompt](../quiz-generation-prompt.md): install the `create-quiz` skill or copy a reusable prompt for generating one strict JSON Quiz object at a time.

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

This base validation checks the Quiz JSON only. It does not require the bare Image filenames in the media example to exist. A real public Catalog contribution must add every referenced file to `content/quizzes/{id}/`; `bun run validate:public-quizzes` checks those files and rejects missing or orphaned assets. The alternative `https://` Image source form is documented in [the Standard's Media section](../standard.md#media), not in this public contribution example.
