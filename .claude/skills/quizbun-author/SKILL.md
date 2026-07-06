---
name: quizbun-author
description: >
  Create excellent, correct, and engaging quizzes as strict JSON in the Quiz
  Object Standard v1, or fix and review existing quiz JSON. Use whenever the user
  wants to generate, repair, or review a quiz. Topic- and repo-agnostic: it runs
  as a standalone install and ignores the surrounding codebase unless the user
  explicitly asks to be quizzed on that code. Inside the Quizbun repo it can also
  run the local validators.
---

# Quiz Author

Generate one Quiz as strict JSON in the Quiz Object Standard v1 — correct, verifiable, and genuinely interesting to take. The skill is self-contained and runs with no repository present.

## Scope

The topic comes from the user, not from the environment. **Ignore the surrounding codebase, project, and docs by default** — do not scan the repo for material. Draw on the surrounding code only when the user explicitly asks to be quizzed on _this_ project (for example, "quiz me on this codebase"). Otherwise the only input is the topic the user names.

## How to generate

The full authoring contract — format rules, quality requirements, the JSON Schema, and a canonical example — lives in the bundled [quiz-generation-prompt.md](../../../docs/quiz-generation-prompt.md). Read it, follow it exactly, and return **one strict JSON object** (no Markdown fences, no commentary) unless the user wants prose around the result. Unknown fields are rejected, so add nothing the schema does not define.

## Quality bar (non-negotiable)

A passing quiz is more than valid JSON. The bundled prompt holds the full rules; the essentials:

- **Verify, don't recall.** Prove every answer before marking it correct — execute code in your head, compute numbers, check definitions and dates. If you cannot verify it, change the question.
- **Prove it in the `explanation`.** Show _why_ the answer is right (the computation, rule, counterexample, or citation) and teach the concept, so a wrong answer becomes a lesson — never just restate the correct Option.
- **Never refer to Options by position.** Renderers shuffle Options, so the JSON order is not the display order — "the first option", "the last option", "option B", or "(option 2)" point at nothing stable. Identify an Option by quoting or paraphrasing its text instead. (Labels are fine only when the question itself defines them in its own `description`, e.g. inside a code snippet.)
- **Make it interesting and easy to read.** Concrete scenarios over abstractions; tight, unambiguous titles that carry the question itself (supporting context goes in `description`); distractors that are plausible misconceptions yet clearly wrong.
- **Illustrate.** Where the topic allows, ground it in real material — a runnable code snippet (tagged with a highlightable language), a worked example, or a short attributed quote from a book, article, standard, notable person, or proverb. Put sources in `references`.

## Validate

- **Standalone:** confirm the JSON parses and check it against the JSON Schema embedded in the bundled prompt. Tell the user the Quizbun import page is the final authority for the cross-field rules JSON Schema cannot express (exactly one correct Option for single-choice, unique Question ids, and so on).
- **Inside the Quizbun repo:** run the project's validators and treat the emitted report as the repair checklist — fix each `Path` it names, then re-run. They reuse the same Zod schema and error formatter as the import page.
  - Private / Library quiz → base Standard only (`description`, `language`, `tags` optional): `bun run validate:docs-examples <file>`.
  - Public Catalog quiz → base Standard **plus** required `description`/`language`/≥1 `tag`, saved as `content/quizzes/{id}.json` with a repo-unique `id`: `bun run validate:public-quizzes`.
