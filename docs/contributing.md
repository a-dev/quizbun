# Contributing a Quiz to the Public Catalog

Quizbun's public Catalog is open for pull requests. This guide covers the whole path: generate a quiz, validate it locally, meet the Catalog's publishing rules, open a PR, and fix anything CI rejects. You need no repo context beyond this page; the published prompt, the examples, and the CI messages are meant to be enough.

## Licensing: what submitting means

**By submitting a public quiz, you license it under the repository's [MIT license](../LICENSE).** There is no per-quiz license field, and there will not be one. If you are not comfortable with that, keep the quiz private: import it on the [import page](https://a-dev.github.io/quizbun/import/) and it stays in your browser, never in the repo.

## Step 1: Generate the quiz

Use the [AI generation prompt](./quiz-generation-prompt.md). It is self-contained: copy it into any AI chat, fill in the topic and question mix, and the AI gets the authoring rules, the JSON Schema, and a canonical example in one paste.

Writing by hand instead? Start from one of the [canonical examples](./examples/README.md) and consult [the Quiz Object Standard](./standard.md) for the rules.

## Step 2: Validate locally on the import page

The [import page](https://a-dev.github.io/quizbun/import/) **is** the local validator. Paste your quiz JSON there:

- If it validates, the quiz lands in your browser Library. Run it once and read every Explanation as a learner would.
- If it fails, you get a path-precise error report. See [the error-message round-trip](#the-error-message-round-trip) below for how to turn that report into a fix.

Nothing you import is uploaded anywhere; private quizzes live only in your browser.

## Step 3: Meet the Public catalog profile

The Standard is the floor; the Catalog adds publishing requirements, enforced by CI:

- `description` is required: say what the quiz covers and who it is for.
- `language` is required: a BCP-47 tag such as `"en"`.
- At least one `tags` entry, kebab-case, so the quiz is discoverable in the Catalog filter. Prefer broad subject tags already used in the Catalog (e.g. `javascript`, `system-design`, `science`) over narrow one-off keywords — a tag that matches a single quiz makes the filter noisier, not more precise. Invent a new tag only when a quiz opens a genuinely new subject area.
- The file is named after the quiz id: a quiz with `"id": "git-basics"` lives in `content/quizzes/git-basics.json`.
- The quiz `id` must be unique across the whole repo.

## Step 4: Open a pull request

1. Fork the repository and create a branch.
2. Add exactly one file per quiz under [`content/quizzes/`](https://github.com/a-dev/quizbun/tree/main/content/quizzes), named `{id}.json`.
3. Open the PR. The PR template walks you through a short checklist mirroring this guide.

## Step 5: Read the CI feedback and revise

CI runs the same validation the import page runs, plus the Public catalog profile. A failure names the file, the JSON path, the problem, and a concrete fix. Update the file in your branch and push; CI re-runs.

## What human review looks for

CI proves the quiz is _valid_; reviewers decide whether it is _good_. Expect feedback on:

- **Topic quality**: the quiz teaches something worth knowing, at a coherent scope.
- **Clarity**: questions are unambiguous; distractors are plausible without making false facts feel correct.
- **Explanation value**: this is the product. An Explanation that just restates the correct answer fails review; it should teach the concept, so a learner who answered wrong leaves knowing _why_.
- **References**: when a Question includes References, they should be relevant, trustworthy, and useful as further reading, not a substitute for the Explanation.

## The error-message round-trip

Validation error messages are a product feature, and they are the same report on both surfaces: the import page (when you validate as a creator) and the CI check (when you contribute). They are written to be pasted straight back into an AI chat.

Here is a real broken quiz with a string `schemaVersion`, an uppercase question id, a missing `explanation`, and an invented `difficulty` field:

```json
{
  "schemaVersion": "1",
  "id": "git-basics",
  "title": "Git basics",
  "questions": [
    {
      "id": "Git_Init",
      "title": "Which command creates a new repository?",
      "type": "single-choice",
      "options": [
        { "text": "`git init`", "isCorrect": true },
        { "text": "`git start`", "isCorrect": false }
      ],
      "difficulty": "easy"
    }
  ]
}
```

Pasting it into the import page produces this report:

```
Quiz JSON is invalid. Please revise it to satisfy the Quiz Object Standard.

1. Path: `schemaVersion`
   Problem: Set `schemaVersion` to the integer `1`.
   Fix: Use `"schemaVersion": 1`. Version strings such as `"1.0"` are invalid.
2. Path: `questions[0].id`
   Problem: Use kebab-case with lowercase latin letters, digits, and single hyphens.
   Fix: Use lowercase latin letters, digits, and single hyphens; do not use spaces, underscores, or leading/trailing hyphens.
3. Path: `questions[0].explanation`
   Problem: Required field is missing.
   Fix: Add this required field using the shape defined by the Standard.
4. Path: `questions[0].difficulty`
   Problem: Unknown field `difficulty`.
   Fix: Remove unknown fields; the Standard is strict at every level.
```

Paste that report back into the AI chat that generated the quiz, with one line such as "fix these validation errors and return the full corrected JSON". The paths and fixes are specific enough that AI tools reliably return a corrected file on the first try.

The CI check speaks the same language. This is the actual output from a real pull request that omitted the required `description`:

```
Public quiz does not satisfy the Public catalog profile in content/quizzes/git-basics.json:

1. Problem at path: `description`
   Problem: The Public catalog profile requires a `description`.
   Fix: Add a short `description` explaining what the quiz covers and who it is for.

Public catalog profile check failed: 1 error(s), 0 warning(s) across 4 quiz file(s) in content/quizzes.
```

Same shape, same fix-oriented wording. Whether the message reaches you on the import page or in a CI log, the loop is identical: read the path, apply the fix (or let your AI chat apply it), validate again.
