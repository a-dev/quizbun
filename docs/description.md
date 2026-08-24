# Quizbun

## Summary

Quizbun is a static, explanation-first quiz catalog for self-learners.

The public site bundles Quizzes from the GitHub repository. Creators can also Import Quiz JSON into their Library and keep it on their device. There is no backend, account, database, or API.

The Standard is reusable. AI tools can generate Quizzes, CI can validate them, Contributors can review them in pull requests, and different Renderers can display them. The project is open source under the MIT license.

## Core product idea

Quizbun helps people learn rather than merely testing them. After submitting an answer, the Learner immediately sees whether it was correct and reads the Explanation.

The main workflow is short:

1. Ask an AI tool to generate a Quiz from the published prompt and JSON Schema.
2. Copy the JSON from the chat into the Import page.
3. Fix any validation errors or save the Quiz.
4. Start learning.

Every product decision should keep this loop reliable.

## Product principles

### Learning before testing

Every Question should teach something. Quizbun always shows the Explanation after submission, whether the answer was correct or incorrect. Correctness is binary because the Explanation matters more than the score.

### Static Catalog, local Library

The build includes Catalog Quizzes and deploys them as static pages. Library Quizzes and Runs stay on the device.

### One strict, AI-first Standard

The Quiz Object Standard favors minimal required fields and fixed behavior over configuration. Strict validation rejects unknown or misspelled fields. Errors must identify the exact problem clearly enough for a person to fix or paste back into an AI chat.

### Safe Markdown

Quiz content uses Markdown, never raw HTML. The Renderer strips raw HTML and sanitizes the rendered output.

### Open contributions

Contributors add Catalog Quizzes through pull requests. CI checks structure and schema. Reviewers check facts, clarity, and the quality of Explanations. Contributions use the repository's MIT license, so the Standard has no per-Quiz license field.

### Presentation-neutral content

The Standard describes content and correctness, not appearance. It has no pagination, option labels, themes, speech settings, or other presentation fields. A CLI, mobile app, or website should be able to render the same Quiz without changing its meaning.

## The Quiz Object Standard

The Standard is a strict, versioned JSON format. `schemaVersion` starts at `1`; optional additions do not change the version, but breaking changes do.

A Quiz has an `id`, `title`, and at least one Question. It may also have a `description`, `language`, `tags`, and `author`. Question `id`s are unique within their Quiz.

Version 1 supports three Question types:

- `single-choice`
- `multiple-choice`
- `input`

Every Question has a title, type, and Explanation. A description may provide context, while References may provide links or further reading.

Choice Options contain only text and correctness. Their identity is their position in the original JSON order. The Renderer may shuffle them, but saved answers still refer to the original order. A Content hash invalidates saved Progress when a Question changes.

Input Questions accept text or numeric answers. Text comparison normalizes case, whitespace, and Unicode by default. Numeric comparison accepts an optional tolerance.

All Questions evaluate to correct or incorrect. Multiple-choice is all-or-nothing. Version 1 has no points or partial credit.

### Content formatting

Every text field is Markdown. Short fields, such as titles and Option text, are single-line and inline-only. Long fields, such as descriptions, Explanations, and References, support full Markdown.

### Source of truth

The Zod schema is the source of truth for imports, CI, and the generated JSON Schema. Canonical examples use the same validator. The published JSON Schema helps AI and non-JavaScript tools, but the import validator remains authoritative for cross-field rules.

### Public catalog profile

Library Quizzes use the minimal Standard. Catalog Quizzes must also have a description, language, at least one Tag, and a repository-wide unique `id`. CI enforces these rules through the Public catalog profile, not a second schema.

## Product surfaces

### Public Catalog

The Catalog contains read-only Quizzes rendered at build time. Learners can filter them by Tags and Export them as JSON.

### Library

The Library stores imported Quizzes on the current device. Learners can Import, open, Export, and delete them. Library Quizzes remain separate from the Catalog, even when their `id`s match.

Importing a Quiz with an `id` already present in the Library requires the Learner to replace it or cancel. Replacing a Quiz preserves Progress only for Questions whose Content hashes still match.

### Import page

The Import page centers on one large textarea. Pasting JSON, choosing a file, and dropping a file all feed the same flow: parse, validate, preview, then save.

The textarea supports the main AI workflow and lets Creators repair invalid JSON in place. Validation errors must help both humans and AI tools correct the file.

### Creator documentation

The documentation includes canonical examples, an AI generation prompt, contributor guidance, and the published JSON Schema.

## Quiz experience

Submitting a Question locks it for the current Run and reveals correctness and the Explanation. The Learner can retry it only by retaking or resetting the Quiz.

Quizbun saves one Run per Quiz. The Run records Progress by Quiz `id` and validates each Question with its Content hash. A Retake replaces the previous Run; version 1 has no Run history.

The Summary shows how many Questions the Learner answered correctly and marks each Question as correct or incorrect. Learners can revisit Explanations, Retake the Quiz, or return to the previous page.

Read aloud uses an on-device English Voice. It is optional Renderer behavior and never sends Quiz content to a speech service.

## Content and storage

Tags are the only taxonomy. Version 1 has no categories, difficulty levels, or other discovery metadata. The first version of Quizbun had too much taxonomy; keeping only Tags is a deliberate constraint.

The repository stores Catalog Quizzes. IndexedDB stores Library Quizzes and Runs. `localStorage` stores small UI preferences. Learners can Export Catalog or Library Quizzes as JSON, but not Progress.

## Out of scope for version 1

- **Progress transfer between devices.** This requires a second versioned Standard and merge rules.
- **Run history and statistics.** These require a new data model and interface.
- **Partial credit.** Quizbun is a learning tool, not an exam system.
- **Raw HTML.** Markdown covers the intended content without expanding the security model.
- **Per-Quiz licenses or structured author records.** The MIT license and optional `author` field are enough.
- **Interface translation.** Quiz content may use any declared language, but the site interface is English.
- **Option ids, presentation hints, or more taxonomy.** These can be added later if real use demands them.

## Long-term direction

If the Standard proves useful, other Renderers and community tools can use it. Future work may include Progress portability, Run history, offline support, and interface translation. Actual use should decide their order.
