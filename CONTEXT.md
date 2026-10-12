# Quizbun

A static, explanation-first quiz catalog built around a JSON quiz standard designed for AI generation. The standard, site, and contribution workflow share this language.

## Language

Use lowercase for project terms in prose, including quiz, question, explanation, catalog, library, and renderer. Capitalize them only at sentence starts or where ordinary English requires it. Keep proper names, such as Quizbun and Quiz Object Standard, unchanged. Preserve capitalization in code identifiers and exact quotations. Headings use sentence case.

### The standard

**Quiz**:
One self-contained learning unit with metadata and an ordered list of questions, expressed as a single JSON object that follows the Quiz Object Standard.
_Avoid_: test, exam, deck

**Quiz Object Standard**, usually **the standard**:
The versioned, strictly validated JSON format that defines what a quiz is. Integer `schemaVersion`; unknown fields are errors.
_Avoid_: format, spec (when referring to the artifact)

**Question**:
One prompt inside a quiz that a learner answers and receives an explanation for. The title asks the question, while the optional description adds context.
_Avoid_: item, task, exercise

**Option**:
One selectable entry in a choice question. An option has `text` and `isCorrect`, and its original JSON position is its identity.
_Avoid_: answer, choice, variant

**Accepted answer**:
One of the strings or numbers an `input` question treats as correct, compared under the question's validation mode (`text` or `numeric`).
_Avoid_: correct answer (ambiguous with options)

**Explanation**:
The teaching text shown after a question is submitted, regardless of correctness. The core reward of the product.
_Avoid_: feedback, rationale, solution

**References**:
Optional question source material shown after the explanation. References use full Markdown for links, citations, and further reading.
_Avoid_: bibliography (unless a formal bibliography is meant), sources (when referring to the standard field)

**Image**:
A structured visual item on a question with a source, required alt text, and optional caption and placement.
_Avoid_: picture, photo, illustration

**Video**:
A structured YouTube reference on a question with a video id, optional start time, and optional placement.
_Avoid_: embed, clip

**Placement**:
The part of a question where an image or video belongs. `question` shows it with the prompt, while `explanation` reveals it with the explanation.
_Avoid_: position, slot

**Tag**:
A kebab-case keyword on a quiz used for filtering and discovery. Tags are the only quiz taxonomy.
_Avoid_: category, topic, label, hashtag

**Renderer**:
An application that displays quizzes. Presentation choices belong to the renderer, not the standard.
_Avoid_: player, viewer, frontend (when referring to the role)

**Public catalog profile**:
The stricter rules applied to catalog quizzes during repository validation. It extends the standard for contributions but is not another schema.
_Avoid_: public schema, extended schema

### The site

**Public catalog**, usually **catalog**:
The bundled, read-only set of quizzes that lives in the repository and ships with the site.
_Avoid_: store, gallery, public library

**Asset folder**:
The directory that holds one catalog quiz's vendored image files.
_Avoid_: uploads, media directory, attachments

**Library**:
A learner's quizzes stored on one device, separate from the catalog.
_Avoid_: my quizzes, collection, private catalog

**Import**:
Bringing quiz JSON into the library after it passes validation.
_Avoid_: upload, load, add

**Import limits**:
The maximum quiz size Quizbun imports: 200 questions and 1 MB of JSON. A renderer limit, not part of the standard.
_Avoid_: schema limits, max length (when referring to the standard)

**Quiz link**:
A URL that carries one quiz in its fragment and opens it in import.
_Avoid_: share link, deep link (deep links already mean player routes)

**Export**:
Saving a catalog or library quiz as JSON. Export never includes progress.
_Avoid_: download, backup

### Learning

**Run**:
One pass by a learner through a quiz. A run completes when every question is submitted, and a retake replaces it.
_Avoid_: attempt, session, playthrough

**Page size**:
A learner-owned renderer setting that controls how many questions appear on a page. Page size is never quiz content.
_Avoid_: questionsPerPage (the deleted quiz field from attempt #1)

**Voice**:
The learner-selected on-device speech voice used by read aloud. Voice is renderer behavior, never quiz content.
_Avoid_: narrator, TTS voice

**Read aloud**:
An opt-in renderer feature that speaks a question's explanation with the selected on-device voice.
_Avoid_: text-to-speech, TTS, narrate

**Progress**:
The saved state of a run, including which questions were submitted and how.
_Avoid_: history, results (progress is one run, not an archive)

**Content hash**:
The fingerprint of a question's content that decides whether a saved answer is still valid. If the question changed, its saved answer is discarded.

**Retake**:
Starting a fresh run on a finished (or reset) quiz, replacing the previous run.
_Avoid_: restart, replay

**Reset progress**:
Explicitly deleting the saved run of a quiz, mid-run or after completion. The same mechanism retake uses, exposed as a button.
_Avoid_: clear, wipe

**Summary**:
The end-of-run view with the result, links to each explanation, and run actions.
_Avoid_: results page, score screen

### People

**Learner**:
A person who takes a quiz and reads its explanations.
_Avoid_: test taker, student, user when the learning role matters

**Creator**:
A person who makes a quiz, usually with AI, for private use or contribution.
_Avoid_: author when referring to the person doing the work

**Contributor**:
Someone who submits a quiz to the catalog through a pull request.

**Author**:
The free-form string in a quiz's optional `author` field. It is not an account or structured identity.
_Avoid_: creator, owner
