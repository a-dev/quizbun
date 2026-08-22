# Contributing a Quiz to the public Catalog

You can submit a Quiz to Quizbun's public Catalog through a pull request. This guide covers generation, local validation, the Catalog's publishing rules, and CI errors. You do not need any other repository context. The published prompt, examples, and CI messages cover the process.

## Licensing: what submitting means

**By submitting a public Quiz, you license it under the repository's [MIT license](../LICENSE).** There is no per-Quiz license field, and there will not be one. If you do not want to use the MIT license, keep the Quiz private. Import it on the [import page](https://a-dev.github.io/quizbun/import/), and it stays in your browser instead of entering the repository.

## Step 1: generate the Quiz

For AI generation, use the [AI generation prompt](./quiz-generation-prompt.md). Copy it into any AI chat and fill in the topic and Question mix. The prompt already includes the authoring rules, JSON Schema, and a canonical example.

Writing the JSON yourself? Start with a [canonical example](./examples/README.md) and check [the Quiz Object Standard](./standard.md) when you need a rule.

## Step 2: validate locally on the import page

Use the [import page](https://a-dev.github.io/quizbun/import/) as the local validator. Paste your Quiz JSON there:

- If it validates, the Quiz lands in your browser Library. Run it once and read every Explanation as a learner would.
- If it fails, you get a path-precise error report. See [the error-message round-trip](#the-error-message-round-trip) below for how to turn that report into a fix.

Quizbun does not upload anything you import. Private Quizzes live only in your browser.

## Step 3: meet the Public catalog profile

The Catalog adds these CI-enforced publishing requirements to the Standard:

- `description` is required. Say what the Quiz covers and who it is for.
- `language` is required. Use a BCP-47 tag such as `"en"`.
- Add at least one kebab-case `tags` entry so people can find the Quiz with the Catalog filter. Prefer broad subjects already used in the Catalog, such as `javascript`, `system-design`, or `science`. A tag that matches one Quiz makes the filter noisier, not more precise. Add a new tag only when a Quiz opens a new subject area.
- Name the file after the Quiz id. A Quiz with `"id": "git-basics"` belongs in `content/quizzes/git-basics.json`.
- The Quiz `id` must be unique across the repository.

### If your Quiz uses Images

The Standard lets an Image `src` be an `https://` URL, but the Catalog does not. Catalog Images must be **vendored**: the file itself lives in the repository, and the Quiz refers to it by bare filename. Remote images make the built site depend on somebody else's server, they rot, and a reviewer cannot check the licensing of a file that is not in the pull request.

- Put the files in an Asset folder named after the Quiz id, next to its JSON: `content/quizzes/git-basics/` beside `content/quizzes/git-basics.json`.
- Reference each one by bare filename, with no directories: `"src": "branch-diagram.svg"`, never `"images/branch-diagram.svg"` or a URL.
- Filenames are kebab-case with an allowed extension: `png`, `jpg`, `jpeg`, `webp`, `avif`, `gif`, or `svg`.
- Every file in the folder must be referenced by the Quiz, and every reference must resolve to a file. CI rejects both orphan files and dangling references, so a folder never quietly accumulates leftovers.
- Each file must be at most 500 KB. Compress or resize rather than shipping an original export.
- Every Image needs non-empty `alt`. A Question Image carries part of the teaching, so it is never decorative.
- Use `caption` for attribution when the Image is not your own work.
- Put anything that gives away the answer behind `"placement": "explanation"`.

Videos are the exception to the vendoring rule: `provider: "youtube"` references are inherently remote, and the site renders them behind a click-to-load facade that contacts YouTube only after a learner asks for it. Verify that every video id resolves to a real video before you write it — CI deliberately never calls YouTube, so a wrong id fails silently in front of learners rather than loudly in the pull request.

Diagrams read better when they follow the site theme. An Image loaded through `<img>` cannot see the page's theme attribute, but an SVG can carry its own `@media (prefers-color-scheme: dark)` block; the diagrams in `content/quizzes/undo-redo-back-stacks-queues/` are a working example.

## Step 4: open a pull request

1. Fork the repository and create a branch.
2. Add one `{id}.json` file per Quiz under [`content/quizzes/`](https://github.com/a-dev/quizbun/tree/main/content/quizzes), plus an Asset folder of the same name if the Quiz uses Images.
3. Open the PR and complete the short checklist in the PR template. It mirrors this guide.

## Step 5: read the CI feedback and revise

CI runs the import page validation plus the Public catalog profile. A failure names the file, JSON path, problem, and a concrete fix. Update the file in your branch and push it again. CI will rerun.

## What human review looks for

CI can prove that a Quiz is _valid_. Reviewers still need to decide whether it is _good_. Expect feedback on these points:

- **Topic and scope.** The Quiz should teach something worth learning at a coherent scope.
- **Clarity.** Questions should be unambiguous. Distractors should be plausible without making false statements feel correct.
- **Explanation value.** An Explanation that only restates the correct answer fails review. It should teach the concept so that a learner who answered incorrectly understands _why_.
- **References.** When a Question includes References, they should be relevant, trustworthy, and useful for further reading. They cannot replace the Explanation.

## The error-message round-trip

Validation errors are a product feature. The import page and CI return the same report. Each error includes a path, the problem, and a suggested fix. You can paste the report back into an AI chat.

This broken Quiz has a string `schemaVersion`, an uppercase Question id, a missing `explanation`, and an invented `difficulty` field:

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

Paste the report back into the AI chat that generated the Quiz, followed by a line such as "fix these validation errors and return the full corrected JSON". The specific paths and fixes usually give the AI enough information to correct the file on its first try.

CI uses the same wording. This output came from a real pull request that omitted the required `description`:

```
Public quiz does not satisfy the Public catalog profile in content/quizzes/git-basics.json:

1. Problem at path: `description`
   Problem: The Public catalog profile requires a `description`.
   Fix: Add a short `description` explaining what the quiz covers and who it is for.

Public catalog profile check failed: 1 error(s), 0 warning(s) across 4 quiz file(s) in content/quizzes.
```

In either place, read the path, apply the fix yourself or send it to your AI chat, then validate again.
