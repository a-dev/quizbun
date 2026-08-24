# Quizbun

A static, explanation-first quiz catalog built around a JSON quiz standard designed for AI generation. The Standard, site, and contribution workflow share this language.

## Language

### The Standard

**Quiz**:
One self-contained learning unit with metadata and an ordered list of Questions, expressed as a single JSON object that follows the Quiz Object Standard.
_Avoid_: test, exam, deck

**Quiz Object Standard**, usually **the Standard**:
The versioned, strictly validated JSON format that defines what a Quiz is. Integer `schemaVersion`; unknown fields are errors.
_Avoid_: format, spec (when referring to the artifact)

**Question**:
One prompt inside a Quiz that a Learner answers and receives an Explanation for. The title asks the Question, while the optional description adds context.
_Avoid_: item, task, exercise

**Option**:
One selectable entry in a choice Question. An Option has `text` and `isCorrect`, and its original JSON position is its identity.
_Avoid_: answer, choice, variant

**Accepted answer**:
One of the strings or numbers an `input` Question treats as correct, compared under the Question's validation mode (`text` or `numeric`).
_Avoid_: correct answer (ambiguous with Options)

**Explanation**:
The teaching text shown after a Question is submitted, regardless of correctness. The core reward of the product.
_Avoid_: feedback, rationale, solution

**References**:
Optional Question source material shown after the Explanation. References use full Markdown for links, citations, and further reading.
_Avoid_: bibliography (unless a formal bibliography is meant), sources (when referring to the Standard field)

**Image**:
A structured visual item on a Question with a source, required alt text, and optional caption and Placement.
_Avoid_: picture, photo, illustration

**Video**:
A structured YouTube reference on a Question with a video id, optional start time, and optional Placement.
_Avoid_: embed, clip

**Placement**:
The part of a Question where an Image or Video belongs. `question` shows it with the prompt, while `explanation` reveals it with the Explanation.
_Avoid_: position, slot

**Tag**:
A kebab-case keyword on a Quiz used for filtering and discovery. Tags are the only Quiz taxonomy.
_Avoid_: category, topic, label, hashtag

**Renderer**:
An application that displays Quizzes. Presentation choices belong to the Renderer, not the Standard.
_Avoid_: player, viewer, frontend (when referring to the role)

**Public catalog profile**:
The stricter rules applied to Catalog Quizzes during repository validation. It extends the Standard for contributions but is not another schema.
_Avoid_: public schema, extended schema

### The site

**Public catalog**, usually **Catalog**:
The bundled, read-only set of quizzes that lives in the repository and ships with the site.
_Avoid_: store, gallery, public library

**Asset folder**:
The directory that holds one Catalog Quiz's vendored Image files.
_Avoid_: uploads, media directory, attachments

**Library**:
A Learner's Quizzes stored on one device, separate from the Catalog.
_Avoid_: my quizzes, collection, private catalog

**Import**:
Bringing Quiz JSON into the Library after it passes validation.
_Avoid_: upload, load, add

**Export**:
Saving a Catalog or Library Quiz as JSON. Export never includes Progress.
_Avoid_: download, backup

### Learning

**Run**:
One pass by a Learner through a Quiz. A Run completes when every Question is submitted, and a Retake replaces it.
_Avoid_: attempt, session, playthrough

**Page size**:
A Learner-owned Renderer setting that controls how many Questions appear on a page. Page size is never Quiz content.
_Avoid_: questionsPerPage (the deleted quiz field from attempt #1)

**Voice**:
The Learner-selected on-device speech voice used by Read aloud. Voice is Renderer behavior, never Quiz content.
_Avoid_: narrator, TTS voice

**Read aloud**:
An opt-in Renderer feature that speaks a Question's Explanation with the selected on-device Voice.
_Avoid_: text-to-speech, TTS, narrate

**Progress**:
The saved state of a Run, including which Questions were submitted and how.
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
The end-of-Run view with the result, links to each Explanation, and Run actions.
_Avoid_: results page, score screen

### People

**Learner**:
A person who takes a Quiz and reads its Explanations.
_Avoid_: test taker, student, user when the learning role matters

**Creator**:
A person who makes a Quiz, usually with AI, for private use or contribution.
_Avoid_: Author when referring to the person doing the work

**Contributor**:
Someone who submits a Quiz to the Catalog through a pull request.

**Author**:
The free-form string in a Quiz's optional `author` field. It is not an account or structured identity.
_Avoid_: creator, owner
