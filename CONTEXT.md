# Quizbun

A static, explanation-first quiz catalog for self-learners, built around a JSON quiz standard designed for AI generation. One context: the standard, the site, and the contribution pipeline all share this language.

## Language

### The Standard

**Quiz**:
One self-contained learning unit — metadata plus an ordered list of questions — expressed as a single JSON object conforming to the Quiz Object Standard.
_Avoid_: test, exam, deck

**Quiz Object Standard** (short: **the Standard**):
The versioned, strictly validated JSON format that defines what a Quiz is. Integer `schemaVersion`; unknown fields are errors.
_Avoid_: format, spec (when referring to the artifact)

**Question**:
One prompt inside a Quiz that the learner answers and gets an Explanation for. Types: `single-choice`, `multiple-choice`, `input`. The `title` carries the question itself; the optional `description` only adds supporting context.
_Avoid_: item, task, exercise

**Option**:
One selectable entry in a choice Question: `{ text, isCorrect }`. Has no id and no label; identity is its position in the original JSON order.
_Avoid_: answer, choice, variant

**Accepted answer**:
One of the strings or numbers an `input` Question treats as correct, compared under the Question's validation mode (`text` or `numeric`).
_Avoid_: correct answer (ambiguous with Options)

**Explanation**:
The teaching text shown after a Question is submitted, regardless of correctness. The core reward of the product.
_Avoid_: feedback, rationale, solution

**References**:
Optional source material on a Question, shown after its Explanation. Long Markdown content intended for links, citations, and further reading.
_Avoid_: bibliography (unless a formal bibliography is meant), sources (when referring to the Standard field)

**Tag**:
A kebab-case keyword (latin letters, digits, `-`) on a Quiz, used for filtering and discovery. The only taxonomy that exists.
_Avoid_: category, topic, label, hashtag

**Renderer**:
Any application that displays Quizzes — the Quizbun site is the first. Shuffling, labeling Options, and layout are Renderer behavior, never content.
_Avoid_: player, viewer, frontend (when referring to the role)

**Public catalog profile**:
The stricter rule set (description, language, ≥1 tag, repo-wide id uniqueness) applied in CI to Public catalog quizzes only. A profile on top of the Standard, not a second schema.
_Avoid_: public schema, extended schema

### The Site

**Public catalog** (short: **Catalog**):
The bundled, read-only set of quizzes that lives in the repository and ships with the site.
_Avoid_: store, gallery, public library

**Library**:
A user's locally stored quizzes on one device, separate from the Catalog. Private by construction — nothing leaves the device.
_Avoid_: my quizzes, collection, private catalog

**Import**:
Bringing quiz JSON into the Library via the import page (paste or file fill the same textarea). Validation happens here; the import page is the final authority on validity.
_Avoid_: upload, load, add

**Export**:
Saving any quiz — Catalog or Library — back out as JSON. Quizzes are the only thing exported; progress never is.
_Avoid_: download, backup

### Learning

**Run**:
One pass of a user through a Quiz. Exactly one saved Run per quiz; a Retake replaces it. A Run completes when every Question is submitted; questions may be answered in any order.
_Avoid_: attempt, session, playthrough

**Page size**:
A learner-owned Renderer setting (1, 3, 5, or 10 questions per page) that windows the question list. Never quiz content — the Standard has no pagination fields.
_Avoid_: questionsPerPage (the deleted quiz field from attempt #1)

**Voice**:
A learner-owned Renderer setting: the on-device speech voice that Read aloud uses, chosen in the footer and stored per browser. Off by default — which hides Read aloud entirely — and English-only in v1. Never quiz content; the Standard has no speech fields.
_Avoid_: narrator, TTS voice

**Read aloud**:
The Renderer's opt-in feature that speaks a Question's Explanation with the browser's local speech engine and the selected Voice. Hidden until a Voice is chosen; the Explanation text is synthesized on the device and never leaves it. Renderer behavior, never content.
_Avoid_: text-to-speech, TTS, narrate

**Progress**:
The auto-saved state of a Run — which Questions were submitted and how. Keyed by quiz id, validated per Question by Content hash.
_Avoid_: history, results (Progress is one Run, not an archive)

**Content hash**:
The fingerprint of a Question's content that decides whether a saved answer is still valid. If the Question changed, its saved answer is discarded.

**Retake**:
Starting a fresh Run on a finished (or reset) Quiz, replacing the previous Run.
_Avoid_: restart, replay

**Reset progress**:
Explicitly deleting the saved Run of a Quiz, mid-run or after completion. The same mechanism Retake uses, exposed as a button.
_Avoid_: clear, wipe

**Summary**:
The end-of-Run screen: "X of Y correct," per-Question marks linking back to Explanations, Retake and Back actions.
_Avoid_: results page, score screen

### People

**Contributor**:
Someone who submits a Quiz to the Public catalog through a pull request.

**Author**:
The free-form string in a Quiz's optional `author` field. Not an account, not structured identity.
_Avoid_: creator, owner

## Example dialogue

> **Dev:** When a user uploads a file on the import page, do we save it straight to the Library?
> **Domain expert:** No — upload just fills the textarea. Import is one surface: paste or file, then validate, then save. The import page is the final authority, not the JSON Schema.
> **Dev:** And if the imported quiz id already exists in the Library?
> **Domain expert:** Explicit choice: replace or cancel. Replace keeps Progress for Questions whose Content hash still matches.
> **Dev:** So if they replace a quiz mid-Run, the Run survives partially?
> **Domain expert:** Per Question, yes. A changed Question loses its saved answer; unchanged ones keep theirs. There's still only one Run — we never archive attempts.
> **Dev:** Is a Catalog quiz ever in the Library?
> **Domain expert:** Only if the user exports it and imports it back — then it's a private copy in a separate namespace, and the same id is fine.
