# Idea of the App

## Summary

Quizbun is a static, explanation-first quiz catalog for self-learners.

The public site ships with bundled quizzes from the GitHub repository. Alongside that, every user can import quizzes from JSON into their own browser and keep them on their device. The app is therefore both a learning product and a reusable quiz standard: AI tools can generate it, CI can validate it, reviewers can vet it in pull requests, and future layouts can render it.

The project is open source (MIT). "Static" means the built site runs entirely in the browser: no database, no API, no servers of any kind. The frontend itself can be advanced and ambitious; the constraint is on the runtime, not on the codebase.

## Core product idea

The main idea is not testing users like an exam platform, but helping them learn: answer a question, submit, and immediately read an explanation.

Quizbun should work well for:

- self-learners who want to practice any topic
- users who want to generate quizzes with AI and load them locally without publishing them

The central workflow the product is built around: ask an AI tool to generate a quiz using the published prompt and schema, copy the JSON from the chat, paste it into Quizbun, and start learning. Every design decision should keep this loop short and reliable.

## Product principles

### 1. Learning before testing

Every question should teach something. After the user submits an answer, the app always shows the explanation, whether the answer was correct or not. Results are binary (correct or incorrect) because the reward is the explanation, not a score.

### 2. Static by default, local by choice

Public quizzes are built into the site and rendered at build time for GitHub Pages. Private quizzes are imported by the user and stored locally in the browser. Nothing ever leaves the device.

### 3. One quiz standard, AI-first

The quiz object standard is the foundation of the product, designed for machine generation first: minimal required fields, hard defaults instead of configuration flags, and strict validation that turns generation mistakes into clear, actionable errors. Every removable field is one less way for generated JSON to be invalid.

### 4. Markdown only, rendered safely

Quiz content is Markdown, never raw HTML. HTML in source content is stripped, and rendered output is sanitized anyway: the rendering layer does not trust the layer above it.

### 5. Open contribution model

The public catalog is open for pull requests. CI checks structure and schema automatically; humans review explanation quality and factual correctness. By submitting a public quiz, contributors license it under the repository's license (stated in the contributor guide; no per-quiz license field).

### 6. Presentation-neutral content

The quiz object describes content and correctness, never how it looks. The standard contains **zero presentation fields**: no pagination settings, no option letters, no themes. Version 1 ships with one default layout, but the format stays reusable for any future renderer (a CLI flashcard tool, a mobile app, a different site).

A useful invariant: questions carry no configuration that changes how results are _interpreted_, only validation config that defines what _counts_ as correct. This keeps all renderers trivially compatible.

## The Quiz Object Standard

### Versioning and strictness

- `schemaVersion` is a plain integer, starting at `1`.
- Adding optional fields does **not** bump the version; only breaking changes do.
- Validation is **strict**: unknown fields are errors at every level of the object. When authors are AIs, leniency is where errors hide; a hallucinated or misspelled field must fail loudly at import, not be silently ignored. Error messages are part of the product surface: they should be precise enough to paste back into an AI chat to get a corrected file.

### Quiz-level fields

| Field           | Required | Notes                                        |
| --------------- | -------- | -------------------------------------------- |
| `schemaVersion` | yes      | integer, `1`                                 |
| `id`            | yes      | kebab-case slug (latin letters, digits, `-`) |
| `title`         | yes      | short field (see content formatting)         |
| `questions`     | yes      | at least 1                                   |
| `description`   | no       | long field                                   |
| `language`      | no       | BCP-47 when present (e.g. `en`)              |
| `tags`          | no       | defaults to `[]`; same charset as ids        |
| `author`        | no       | plain string, free-form                      |

The quiz `id` is the primary key. Importing a quiz whose `id` already exists in the library triggers an explicit choice: **replace** (treated as an update; progress survives per question where content hashes still match) or **cancel**. No silent renames, no duplicates. Public and private quizzes live in separate namespaces, so a private id may coincide with a public one.

Question `id`s are kebab-case and unique **within their quiz** only.

Every Question has a required `id`, `title`, `type`, and `explanation`. The `title` carries the question itself — the actual ask. `description` is optional prompt context rendered as secondary text (a scenario, code, constraints), never the question itself; `references` is optional long Markdown content for links, citations, or further reading, shown after the Explanation. Both optional fields must be non-empty when present. Where practical, Reference link text should name both the publication and the linked article or topic (for example, `[MDN: Array.prototype.sort()](...)`); this is a recommendation, not a Standard requirement.

### Question types

Version 1 supports three types:

- `single-choice`
- `multiple-choice`
- `input`

### Options

Choice options are bare objects: `{ "text": "...", "isCorrect": true }`. There are no option ids and no option labels ("A", "B", …): labeling is the renderer's job, and identity is by position in the original JSON order.

Two renderer rules make this safe, and they are part of the standard's renderer documentation:

1. Saved answers always reference the **original JSON order**, never the displayed order.
2. Progress is keyed by question `id` and invalidated by a **content hash** of the question: if the question changed, the saved answer for it is discarded.

Shuffling options is renderer behavior, not content. A renderer may shuffle freely, and should persist the shuffle order for the active run so reloads look stable.

### Input validation

Two modes, with hard defaults so the common case needs zero flags:

- `"mode": "text"`: case-insensitive, trimmed, whitespace-collapsed, Unicode-normalized (NFC) by default. One optional flag: `caseSensitive: true`.
- `"mode": "numeric"`: parses the user's input as a number; optional `tolerance` (default `0`). Comma is accepted as a decimal separator.

Both modes take `acceptedAnswers` (one or more). A minimal input question is just:

```json
"validation": { "mode": "text", "acceptedAnswers": ["first conditional"] }
```

### Correctness model

Every question evaluates to binary **correct / incorrect**. Multiple-choice is all-or-nothing; that is the behavior, not a default. There is no scoring configuration, no points, no partial credit in v1. The summary is simply "X of Y correct."

### Content formatting

One rule, two tiers:

> **Every text field is Markdown. Short fields (`title`s and option `text`) are single-line and inline-only; long fields (`description`s, `explanation`, and `references`) are full Markdown.**

- Raw HTML is not supported anywhere; it is stripped from rendered output.
- "Inline-only" is renderer-enforced, not validated at import: block syntax in a short field renders flattened, degraded but never invalid.
- The renderer strips formatting from titles in contexts that cannot render Markdown (browser tab, plain lists).

### Source of truth and published artifacts

The **Zod schema is the single source of truth**. Everything else derives from it:

- The site, the import page, and the CI validation scripts all import the same Zod schema: one implementation, zero drift.
- A **JSON Schema** file is generated from it (`z.toJSONSchema()`) and published at a stable URL on the site (e.g. `/schema/quiz.v1.json`). This is the artifact for AI workflows: referenceable in prompts, usable with structured-output APIs and non-JS validators. CI regenerates it and fails on diff.
- The canonical example quizzes in docs are validated by the same schema in CI.
- The AI generation prompt embeds the JSON Schema plus one canonical example.

The published JSON Schema is necessarily slightly looser than the Zod validator (cross-field rules like "exactly one correct option in single-choice" become prose annotations). The import page is the final authority.

### Public catalog profile

The core schema stays minimal so local quizzes are frictionless. The public catalog enforces a **stricter profile on top of it, in CI only**; it is not a second schema:

- `description`, `language`, and at least one tag are required
- quiz `id` is unique across the repository
- Markdown/sanitization and structural checks pass

## Main product surfaces

### Public catalog

The site includes a bundled catalog of public quizzes stored in the repository. These quizzes are:

- rendered as static pages at build time
- read-only inside the public catalog
- filterable by tags
- exportable as JSON

Tag: a keyword (only latin letters and `-`, no spaces or special characters) that categorizes quizzes for filtering and discovery. Like hashtags without the `#`.

### Private library

Each user can import quiz JSON into the browser. Imported quizzes are:

- stored locally on that device
- separated from the public catalog in the interface
- accessible through local-only client-resolved routes
- manageable with a minimal library UI: list, import, open, export, delete
- filterable by tags, using the same filter component as the catalog

### Import page

One page, one surface: a large **textarea**. Pasting JSON and uploading a file are the same path, because uploading (or drag-and-drop) simply fills the textarea with the file's contents. From there: parse → validate → show errors _or_ show a preview (title, question count, tags) → save to the library.

Paste is the primary input because the core workflow ends in an AI chat window with JSON in a code block. Validation errors are written to be useful both to humans and when pasted back into the AI chat; the error-message round-trip is a feature, and the docs should present it as one. The textarea also allows hand-editing a broken file in place after seeing the errors.

### Documentation for creators

Examples, a reusable AI generation prompt, contributor guidance, and the published JSON Schema, so people and AI tools generate valid quizzes consistently.

## Quiz experience

### Feedback model

The app shows correctness and the explanation immediately after each submitted question. Once submitted, a question is locked for that run; re-answering after reading the explanation carries no learning signal. Retaking the quiz is the legitimate way to try again.

### Resume and progress

In-progress state is auto-saved so the user can return to the exact place where they stopped, on the same device. The progress model fits in one sentence: **one saved run per quiz, keyed by quiz id, validated per question by content hash, replaced on retake.**

### Retake and reset

- A finished quiz can always be retaken. A retake starts a fresh run (and the renderer may reshuffle options).
- A **"Reset progress"** button exposes the same mechanism explicitly: it deletes the saved run for that quiz, mid-run or after completion.
- No attempt history in v1: the previous run is replaced, not archived.

### Summary screen

Minimal: "X of Y correct," the question list with correct/incorrect marks (tapping one revisits its explanation), and two actions, Retake and Back.

### Read aloud

Explanations can be read aloud by the browser's built-in speech engine, as an opt-in accessibility aid, never a default. The reader chooses a voice in the footer (off by default); only then does a small read-aloud control appear beside each explanation. This is pure renderer behavior (the standard carries no speech fields, Principle 6), and it honors "local by choice" (Principle 2): only on-device voices are offered, so the explanation is spoken locally and never sent to a network service. v1 offers English voices only, matching the English-only site chrome; reading content in other languages waits until the renderer can match a voice to the quiz `language`.

## Content and taxonomy

Just tags. No levels, no categories, no difficulty, no metadata beyond the quiz-level `tags` array. Filtering and discovery work on tags alone; anything richer can be added later without breaking the core experience. (A verbose taxonomy was the main mistake of the first attempt at this project; this is a deliberate hard constraint, not an oversight.)

## Data and storage

### Public content

Public quizzes live in the repository and are rendered into the static site during build.

### Local content

Private quizzes and learning progress are stored in IndexedDB. Small UI preferences can use localStorage.

### Export

Users can export any quiz, public or private, as JSON. That is the complete export story for v1; progress is never exported (see Out of scope for v1).

## Contribution model

Public quizzes are contributed through GitHub pull requests.

Automated validation covers:

- schema validation (strict, shared Zod schema)
- required ids and id uniqueness
- public catalog profile checks (description, language, tags)
- Markdown and sanitization checks
- structural integrity checks

Human review focuses on topic quality, clarity, and explanation value.

## Out of scope for v1

Explicit cuts, each with the reason, to keep the next planning round honest:

- **Progress export/import across devices**: requires designing and versioning a second standard plus merge semantics; the quizzes themselves are already portable.
- **Attempt history / statistics**: a new data model and stats UI; pairs naturally with progress export later.
- **Partial-credit scoring**: exam machinery; contradicts learning-first. An optional `scoring` field would be additive later.
- **Raw HTML in content**: every real use case is covered by Markdown; allowing HTML now and restricting it later would be a breaking change.
- **Per-quiz license / structured author metadata**: repo license plus an optional `author` string is enough.
- **PWA / offline support**: its own project; "no servers" stays true regardless.
- **UI internationalization**: the site chrome ships in English; quiz _content_ can be in any language via the `language` field.
- **Option-level ids, presentation hints, additional taxonomy**: all additive if ever genuinely needed. Adding fields later is cheap; removing them is a breaking change.

## Long-term direction

If the quiz object standard proves useful, Quizbun can evolve beyond a single site. The same content format could support other frontends and designs, community tools, and stronger AI-assisted quiz creation workflows while keeping the underlying quiz data portable. The features cut from v1 (progress portability, attempt history, offline support, UI i18n) are the natural candidates for that evolution, in whatever order real usage demands.
