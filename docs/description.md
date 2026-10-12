# Quizbun

## Summary

Quizbun is a static, explanation-first quiz catalog for self-learners.

The public site bundles quizzes from the GitHub repository. Creators can also import quiz JSON into their library and keep it on their device. There is no backend, account, database, or API.

The standard is reusable:

- AI tools can generate quizzes.
- CI can validate quizzes.
- Contributors can review quizzes in pull requests.
- Different renderers can display quizzes.
  The project is open source under the MIT license.

## Core product idea

Quizbun helps people learn rather than merely testing them. After submitting an answer, the learner immediately sees whether it was correct and reads the explanation.

The main workflow is short:

1. Ask an AI tool to generate a quiz from the published prompt and JSON Schema.
2. Use one of these methods on the import page:
   - Save the generated JSON file. Choose the file or drag it onto the page.
   - Paste the JSON from the chat.
   - Open the quiz link that the AI generated.
3. Fix any validation errors or save the quiz.
4. Start learning.

Every product decision should keep this loop reliable.

## Product principles

### Learning before testing

Every question should teach something. Quizbun always shows the explanation after submission, whether the answer was correct or incorrect. Correctness is binary because the explanation matters more than the score.

### Static catalog, local library

The build includes catalog quizzes and deploys them as static pages. Library quizzes and runs stay on the device.

### One strict, AI-first standard

The Quiz Object Standard favors minimal required fields and fixed behavior over configuration. Strict validation rejects unknown or misspelled fields. Errors must identify the exact problem clearly. A person must be able to fix the problem or paste the error into an AI chat.

### Safe Markdown

Quiz content uses Markdown, never raw HTML. The renderer strips raw HTML and sanitizes the rendered output.

### Open contributions

Contributors add catalog quizzes through pull requests. CI checks structure and schema. Reviewers check facts, clarity, and the quality of explanations. Contributions use the repository's MIT license, so the standard has no per-quiz license field.

### Presentation-neutral content

The standard describes content and correctness, not appearance. It has no pagination, option labels, themes, speech settings, or other presentation fields. A CLI, mobile app, or website should be able to render the same quiz without changing its meaning.

## The Quiz Object Standard

The standard is a strict, versioned JSON format. `schemaVersion` starts at `1`. Optional additions do not change the version. Breaking changes change the version.

A quiz has an `id`, `title`, and at least one question. It may also have a `description`, `language`, `tags`, and `author`. Question `id`s are unique within their quiz.

Version 1 supports three question types:

- `single-choice`
- `multiple-choice`
- `input`

Every question has a title, type, and explanation. A description may provide context, while references may provide links or further reading.

Choice options contain only text and correctness. Their identity is their position in the original JSON order. The renderer may shuffle them, but saved answers still refer to the original order. A content hash invalidates saved progress when a question changes.

Input questions accept text or numeric answers. Text comparison normalizes case, whitespace, and Unicode by default. Numeric comparison accepts an optional tolerance.

All questions evaluate to correct or incorrect. Multiple-choice is all-or-nothing. Version 1 has no points or partial credit.

### Content formatting

Every text field is Markdown. Short fields, such as titles and option text, are single-line and inline-only. Long fields, such as descriptions, explanations, and references, support full Markdown.

### Source of truth

The Zod schema is the source of truth for imports, CI, and the generated JSON Schema. Canonical examples use the same validator. The published JSON Schema helps AI and non-JavaScript tools, but the import validator remains authoritative for cross-field rules.

### Public catalog profile

Library quizzes use the minimal standard. Catalog quizzes must also have a description, language, at least one tag, and a repository-wide unique `id`. CI enforces these rules through the public catalog profile, not a second schema.

## Product surfaces

### Public catalog

The catalog contains read-only quizzes that the renderer renders at build time. Learners can filter them by tags and export them as JSON.

### Library

The library stores imported quizzes on the current device. Learners can import, open, export, and delete them. Library quizzes remain separate from the catalog, even when their `id`s match.

Importing a quiz with an `id` already present in the library requires the learner to replace it or cancel. Replacing a quiz preserves progress only for questions whose Content hashes still match.

The import limits apply on import and on replace. Quizzes already in the library are not checked again.

### Import page

The import page centers on one large textarea. All import methods use the same sequence: parse, validate, preview, then save. These methods include pasted JSON, selected files, dropped files, and quiz links. A quiz link carries the quiz in the URL fragment, so the server never receives it. Opening a quiz link fills the textarea and validates the JSON. The learner still saves explicitly.

Quizbun imports quizzes of at most 200 questions and 1 MB of JSON. A quiz should stay a learnable unit, and a larger topic works better as several quizzes. These import limits belong to Quizbun as a renderer, not to the standard.

The textarea supports the main AI workflow and lets creators repair invalid JSON in place. Validation errors must help both humans and AI tools correct the file.

### Creator documentation

The documentation includes canonical examples, an AI generation prompt, contributor guidance, and the published JSON Schema.

## Quiz experience

Submitting a question locks it for the current run and reveals correctness and the explanation. The learner can retry the question only through retake or reset progress.

Quizbun saves one run per quiz. The run records progress by quiz `id` and validates each question with its content hash. A retake replaces the previous run. Version 1 has no run history.

The summary shows how many questions the learner answered correctly and marks each question as correct or incorrect. Learners can revisit explanations, retake the quiz, or return to the previous page.

Read aloud uses an on-device English voice. It is optional renderer behavior and never sends quiz content to a speech service.

## Content and storage

Tags are the only taxonomy. Version 1 has no categories, difficulty levels, or other discovery metadata. The first version of Quizbun had too much taxonomy. Keeping only tags is a deliberate constraint.

The repository stores catalog quizzes. IndexedDB stores library quizzes and runs. `localStorage` stores small UI preferences. Learners can export catalog or library quizzes as JSON, but not progress.

## Out of scope for version 1

- **Progress transfer between devices.** This requires a second versioned standard and merge rules.
- **Run history and statistics.** These require a new data model and interface.
- **Partial credit.** Quizbun is a learning tool, not an exam system.
- **Raw HTML.** Markdown covers the intended content without expanding the security model.
- **Per-quiz licenses or structured author records.** The MIT license and optional `author` field are enough.
- **Interface translation.** Quiz content may use any declared language, but the site interface is English.
- **Option ids, presentation hints, or more taxonomy.** These can be added later if real use demands them.

## Long-term direction

If the standard proves useful, other renderers and community tools can use it. Future work may include progress portability, run history, offline support, and interface translation. Actual use should decide their order.
