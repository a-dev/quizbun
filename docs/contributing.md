# Contributing a Quiz to the public catalog

Submit a Quiz to Quizbun's [public catalog](https://a-dev.github.io/quizbun/quizzes) through a pull request. This guide covers how to create and validate it, meet the publishing rules, and respond to review feedback.

## License

By submitting a public Quiz, you license it under the repository's [MIT license](../LICENSE). Separate per-Quiz licenses are not supported or planned. If you do not want to use MIT, keep your Quiz private by importing it on the [import page](https://a-dev.github.io/quizbun/import/).

## Step 1: generate the Quiz

Use the [create-quiz](https://www.skills.sh/a-dev/quizbun/create-quiz) skill or copy the [AI generation prompt](./quiz-generation-page.md) into any AI chat and specify your topic and Question mix. It includes the authoring rules, JSON Schema, and a canonical example.

To write the JSON yourself, start with a [canonical example](./examples/README.md) and check [the Quiz Object Standard](./standard.md) when you need a rule.

## Step 2: validate locally

Both validators below use the same schema and error formatter. See [the error-message round-trip](#the-error-message-round-trip) for an example report.

### The import page

Paste your Quiz JSON into the [import page](https://a-dev.github.io/quizbun/import/):

- If it validates, save the Quiz to your Library. Complete a Run and read every Explanation as a Learner would.
- If it fails, the error report identifies the exact JSON path to fix.

Quizbun does not upload anything you import. Private Quizzes live only in your browser.

### The create-quiz validator

The import page checks one Quiz object. To also check that the filename matches its `id`, that its `id` is unique across the repository, and that its Asset folder meets the rules below, use the `create-quiz` validator. It runs the same code as CI. Install the skill with the [Skills CLI](https://skills.sh):

```sh
npx skills add a-dev/quizbun --skill create-quiz
```

Run the Public catalog profile over the content directory of your fork:

```sh
node <create-quiz-skill>/scripts/validate-quiz.mjs --profile catalog content/quizzes
```

Drop `--profile catalog` to check a single file against the Standard alone:

```sh
node <create-quiz-skill>/scripts/validate-quiz.mjs my-quiz.json
```

The validator requires Node.js 22.12 or newer, with no additional dependencies.

## Step 3: meet the Public catalog profile

The Catalog adds these CI-enforced publishing requirements to the Standard:

- `description` is required. Say what the Quiz covers and who it is for.
- `language` is required. Use a BCP-47 tag such as `"en"`.
- Add at least one kebab-case `tags` entry for the Catalog filter. Reuse broad subjects such as `javascript`, `system-design`, or `science`. Avoid Tags specific to one Quiz. Add a new Tag only for a new subject area.
- Name the file after the Quiz id. A Quiz with `"id": "git-basics"` belongs in `content/quizzes/git-basics.json`.
- The Quiz `id` must be unique across the repository.

### If your Quiz uses Images

Catalog Images must be stored in the repository and referenced by bare filename. The Standard allows an `https://` URL in an Image's `src`, but the Catalog rejects remote Images. Local files avoid broken links and dependencies on other servers, and let reviewers check Image licensing in the pull request.

- Put the files in an Asset folder named after the Quiz id, next to its JSON: `content/quizzes/git-basics/` beside `content/quizzes/git-basics.json`.
- Reference each one by bare filename, with no directories: `"src": "branch-diagram.svg"`, never `"images/branch-diagram.svg"` or a URL.
- Filenames are kebab-case with an allowed extension: `png`, `jpg`, `jpeg`, `webp`, `avif`, `gif`, or `svg`.
- Reference every file in the folder, and include a file for every reference. CI rejects unused files and missing files.
- Each file must be at most 500 KB. Compress or resize larger files.
- Every Image needs non-empty `alt`. Images must help teach the Question, so they are never decorative.
- Use `caption` for attribution when the Image is not your own work.
- Put anything that gives away the answer behind `"placement": "explanation"`.
- Run `bun run quiz:sizes:generate` after adding or replacing an image file, and commit what it writes.

The generation command reads each file to set the Image's `width` and `height`. These values reserve space while the Image loads so Options stay in place. Never type or estimate dimensions. CI runs `bun run quiz:sizes:check` to catch mismatches, including dimensions left unchanged after cropping.

Videos use remote `provider: "youtube"` references. The site contacts YouTube only when a Learner clicks to load a Video. Verify each Video id before adding it. CI does not contact YouTube, so it cannot catch invalid ids. Add `--check-media` to the validator command to check every YouTube id and remote Image URL over the network.

Make diagrams readable in light and dark themes. An Image loaded through `<img>` cannot access the page's theme attribute. An SVG can include its own `@media (prefers-color-scheme: dark)` block. See the diagrams in `content/quizzes/undo-redo-back-stacks-queues/` for an example.

## Step 4: open a pull request

1. Fork the repository and create a branch.
2. Add one `{id}.json` file per Quiz under [`content/quizzes/`](https://github.com/a-dev/quizbun/tree/main/content/quizzes), plus an Asset folder of the same name if the Quiz uses Images.
3. Open the pull request and complete the template's checklist, which follows this guide.

## Step 5: read the CI feedback and revise

CI checks the Standard and the Public catalog profile. Each error names the file, JSON path, problem, and suggested fix. Update the file and push your changes to rerun CI.

## What human review looks for

Reviewers check the Quiz's teaching quality:

- Keep the Quiz focused on a useful topic.
- Write unambiguous Questions. Incorrect Options should be plausible without misleading Learners.
- Use each Explanation to teach the concept and explain why an answer is correct or incorrect. Simply restating the correct answer fails review.
- Include relevant, trustworthy References for further reading when useful. They cannot replace the Explanation.

## The error-message round-trip

The import page and CI use the same error report format. Paste the report into an AI chat or use the paths and suggested fixes to edit the JSON yourself.

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

Paste the report into the AI chat that generated the Quiz and ask: "Fix these validation errors and return the full corrected JSON." Then validate the result again.

CI uses the same wording. This output came from a real pull request that omitted the required `description`:

```
Public quiz does not satisfy the Public catalog profile in content/quizzes/git-basics.json:

1. Problem at path: `description`
   Problem: The Public catalog profile requires a `description`.
   Fix: Add a short `description` explaining what the quiz covers and who it is for.

Public catalog profile check failed: 1 error(s), 0 warning(s) across 4 Quiz file(s) in content/quizzes.
```

Fix the reported errors and validate again before submitting.
