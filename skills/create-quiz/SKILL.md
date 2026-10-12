---
name: create-quiz
description: >
  Create, validate, repair, or review one explanation-first quiz as strict JSON
  in the Quiz Object Standard v1. Use only when the user explicitly asks for a
  Quiz in the Quiz Object Standard or invokes create-quiz, or when the quizbun
  skill delegates to it. Never start it for general questions about quizzes,
  tests, or learning.
---

# Create a quiz

Produce one correct and engaging quiz as strict JSON. This skill is self-contained and does not require the Quizbun application or repository.

## Authoring contract

Before creating, repairing, or reviewing a quiz, read [references/quiz-generation-prompt.md](references/quiz-generation-prompt.md) completely. It contains the format rules, quality requirements, JSON Schema, and canonical example.

Use the user's requested topic. Ignore the surrounding repository unless the user explicitly asks for a quiz about that project or its code.

For a new quiz, follow the prompt's clarification stage: ask only for missing details, then generate without a separate plan approval. For repairs or reviews, preserve the existing scope unless the user requests changes.

Follow the prompt's built-in writing review and file-first delivery instructions. Save the validated quiz as `<quiz-id>.json` and provide an accessible file link. If file creation is unavailable, provide one complete JSON code block with save instructions. Honor an explicit request for raw JSON.

## Validate every result

Resolve `scripts/validate-quiz.mjs` relative to this `SKILL.md` and run it with Node.js. The validator has no dependencies and requires no installation step.

For an ordinary private or standalone quiz, use the standard profile:

```sh
node <create-quiz-skill>/scripts/validate-quiz.mjs quiz.json
node <create-quiz-skill>/scripts/validate-quiz.mjs --stdin < quiz.json
```

For a public catalog contribution, validate the directory containing `{id}.json` files and their `{id}/` asset folders:

```sh
node <create-quiz-skill>/scripts/validate-quiz.mjs \
  --profile catalog \
  content/quizzes
```

The standard profile checks JSON syntax, the complete version 1 schema, unknown fields, correct option counts, and unique question ids. The catalog profile adds required catalog metadata, repo-wide quiz id and filename checks, Markdown and sanitization checks, and all asset folder rules.

When a quiz contains remote images or YouTube videos, verify them over the network before returning the quiz:

```sh
node <create-quiz-skill>/scripts/validate-quiz.mjs \
  --check-media \
  quiz.json
```

If network access is unavailable, do not invent or guess media identifiers. Omit unverified media. Catalog images must be vendored, so the catalog profile checks their files locally; `--check-media` still verifies YouTube videos.

Fix every reported path and rerun the same command until it exits successfully. Do not claim that a quiz is valid based only on inspection or the bundled JSON Schema. The script also enforces rules JSON Schema cannot express.

For callers that prefer npm, the bundled alias works without `npm install`:

```sh
npm --prefix <create-quiz-skill> run validate -- quiz.json
```

The machine-readable schema is also available at [references/quiz.v1.schema.json](references/quiz.v1.schema.json) for editors and external tooling. The validation script remains the final authority.

## Quality review

Schema validity is the floor. Before returning the quiz, verify each answer, make every explanation teach why the answer is correct, keep distractors plausible, and remove references to option positions because renderers may shuffle options. Check the bundled authoring contract for the complete quality bar.

To open the finished quiz in Quizbun, use the `quizbun` skill.
