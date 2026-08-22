---
name: create-quiz
description: >
  Create, validate, repair, or review one explanation-first Quiz as strict JSON
  in the Quiz Object Standard v1. Use when the user explicitly invokes this
  skill to author Quizbun-compatible quiz content. Topic- and repo-agnostic
  unless the user asks for a Quiz about the surrounding project.
disable-model-invocation: true
---

# Create a Quiz

Produce one correct and engaging Quiz as strict JSON. This skill is self-contained and does not require the Quizbun application or repository.

## Authoring contract

Before creating, repairing, or reviewing a Quiz, read [references/quiz-generation-prompt.md](references/quiz-generation-prompt.md) completely. It contains the format rules, quality requirements, JSON Schema, and canonical example.

Use the user's requested topic. Ignore the surrounding repository unless the user explicitly asks for a Quiz about that project or its code.

Return one JSON object with no Markdown fence or surrounding commentary unless the user requests another presentation.

## Validate every result

Resolve `scripts/validate-quiz.mjs` relative to this `SKILL.md` and run it with Node.js. The validator has no dependencies and requires no installation step.

For an ordinary private or standalone Quiz, use the Standard profile:

```sh
node <create-quiz-skill>/scripts/validate-quiz.mjs quiz.json
node <create-quiz-skill>/scripts/validate-quiz.mjs --stdin < quiz.json
```

For a public Catalog contribution, validate the directory containing `{id}.json` files and their `{id}/` Asset folders:

```sh
node <create-quiz-skill>/scripts/validate-quiz.mjs \
  --profile catalog \
  content/quizzes
```

The Standard profile checks JSON syntax, the complete version 1 schema, unknown fields, correct Option counts, and unique Question ids. The Catalog profile adds required Catalog metadata, repo-wide Quiz id and filename checks, Markdown and sanitization checks, and all Asset folder rules.

When a Quiz contains remote Images or YouTube Videos, verify them over the network before returning the Quiz:

```sh
node <create-quiz-skill>/scripts/validate-quiz.mjs \
  --check-media \
  quiz.json
```

If network access is unavailable, do not invent or guess media identifiers. Omit unverified media. Catalog Images must be vendored, so the Catalog profile checks their files locally; `--check-media` still verifies YouTube Videos.

Fix every reported path and rerun the same command until it exits successfully. Do not claim that a Quiz is valid based only on inspection or the bundled JSON Schema. The script also enforces rules JSON Schema cannot express.

For callers that prefer npm, the bundled alias works without `npm install`:

```sh
npm --prefix <create-quiz-skill> run validate -- quiz.json
```

The machine-readable schema is also available at [references/quiz.v1.schema.json](references/quiz.v1.schema.json) for editors and external tooling. The validation script remains the final authority.

## Quality review

Schema validity is the floor. Before returning the Quiz, verify each answer, make every Explanation teach why the answer is correct, keep distractors plausible, and remove references to Option positions because Renderers may shuffle Options. Check the bundled authoring contract for the complete quality bar.
