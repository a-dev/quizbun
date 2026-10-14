# Contributing a quiz to the public catalog

Submit a quiz to Quizbun's [public catalog](https://quizbun.fyi/quizzes) through a pull request. This guide explains how to create and validate a quiz. It also explains the publishing rules and how to respond to review feedback.

## License

When you submit a catalog quiz, you license it under the repository's [MIT license](../LICENSE). Quizbun does not support or plan separate per-quiz licenses. If you do not want to use MIT, keep your quiz private by importing it on the [import page](https://quizbun.fyi/import/).

## Step 1: generate the quiz

Use the [create-quiz](https://www.skills.sh/a-dev/quizbun/create-quiz) skill. Alternatively, copy the [AI generation prompt](./quiz-generation-page.md) into any AI chat. Specify your topic and question mix. The skill and prompt include the authoring rules, JSON Schema, and a canonical example.

To write the JSON yourself, start with a [canonical example](./examples/README.md). Consult [the quiz Object standard](./standard.md) when you need a rule.

## Step 2: validate locally

Both validators below use the same schema and error formatter. See [the error-message round-trip](#the-error-message-round-trip) for an example report.

### The import page

Paste your quiz JSON into the [import page](https://quizbun.fyi/import/):

- If validation succeeds, save the quiz to your library. Complete a run. Read every explanation as a learner would.
- If it fails, the error report identifies the exact JSON path to fix.

Quizbun does not upload anything you import. Private quizzes live only in your browser.

### The create-quiz validator

The import page validates one quiz object. Use the `create-quiz` validator to validate these additional requirements:

- The filename matches the quiz `id`.
- The quiz `id` is unique across the repository.
- The asset folder meets the rules below.

The validator runs the same code as CI. Install the skill with the [Skills CLI](https://skills.sh):

```sh
npx skills add a-dev/quizbun --skill create-quiz
```

Run the public catalog profile over the content directory of your fork:

```sh
node <create-quiz-skill>/scripts/validate-quiz.mjs --profile catalog content/quizzes
```

Remove `--profile catalog` to check a single file against the standard alone:

```sh
node <create-quiz-skill>/scripts/validate-quiz.mjs my-quiz.json
```

The validator requires Node.js 22.12 or newer, with no additional dependencies.

## Step 3: meet the public catalog profile

The catalog adds these CI-enforced publishing requirements to the standard:

- The catalog requires `description`. Say what the quiz covers and who it is for.
- The catalog requires `language`. Use a BCP-47 tag such as `"en"`.
- Add at least one kebab-case `tags` entry for the catalog filter. Reuse broad subjects such as `javascript`, `system-design`, or `science`. Avoid tags specific to one quiz. Add a new tag only for a new subject area.
- Name the file after the quiz id. A quiz with `"id": "git-basics"` belongs in `content/quizzes/git-basics.json`.
- The quiz `id` must be unique across the repository.
- The quiz has at most 200 questions and 1 MB of JSON, the same [import limits](./import-limits.md) the import page applies.

### If your quiz uses images

Store catalog images in the repository. Reference them by bare filename. The standard allows an `https://` URL in an image's `src`, but the catalog rejects remote images. Local files avoid broken links and dependencies on other servers. They also let reviewers check image licensing in the pull request.

- Put the files in an asset folder named after the quiz id, next to its JSON: `content/quizzes/git-basics/` beside `content/quizzes/git-basics.json`.
- Reference each one by bare filename, with no directories: `"src": "branch-diagram.svg"`, never `"images/branch-diagram.svg"` or a URL.
- Filenames are kebab-case with an allowed extension: `png`, `jpg`, `jpeg`, `webp`, `avif`, `gif`, or `svg`.
- Reference every file in the folder. Include a file for every reference. CI rejects unused files and missing files.
- Each file must be at most 500 KB. Compress or resize larger files.
- Every image needs non-empty `alt`. Images must help teach the question, so they are never decorative.
- Use `caption` for attribution when the image is not your own work.
- Use `"placement": "explanation"` for anything that reveals the answer.
- Run `bun run quiz:sizes:generate` after you add or replace an image file. Commit the generated changes.

The generation command reads each file to set the image's `width` and `height`. These values reserve space while the image loads so options stay in place. Never type or estimate dimensions. CI runs `bun run quiz:sizes:check` to catch mismatches, including dimensions left unchanged after cropping.

Videos use remote `provider: "youtube"` references. The site contacts YouTube only when a learner clicks to load a video. Check each video id before you add it. CI does not contact YouTube, so it cannot catch invalid ids. Add `--check-media` to the validator command to check every YouTube id and remote image URL over the network.

Make diagrams readable in light and dark themes. An image loaded through `<img>` cannot access the page's theme attribute. An SVG can include its own `@media (prefers-color-scheme: dark)` block. See the diagrams in `content/quizzes/undo-redo-back-stacks-queues/` for an example.

## Step 4: open a pull request

1. Fork the repository.
2. Create a branch.
3. Add one `{id}.json` file per quiz under [`content/quizzes/`](https://github.com/a-dev/quizbun/tree/main/content/quizzes), plus an asset folder of the same name if the quiz uses images.
4. Open the pull request.
5. Complete the template's checklist, which follows this guide.

## Step 5: read the CI feedback and revise

CI checks the standard and the public catalog profile. Each error names the file, JSON path, problem, and suggested fix. Update the file. Push your changes to run CI again.

## What human review looks for

Reviewers check the quiz's teaching quality:

- Keep the quiz focused on a useful topic.
- Write unambiguous questions. Incorrect options should be plausible without misleading learners.
- Use each explanation to teach the concept and explain why an answer is correct or incorrect. Simply restating the correct answer fails review.
- Include relevant, trustworthy references for further reading when useful. They cannot replace the explanation.
- Write titles in sentence case. Capitalize the first word and words that are always capitalized, such as names, products, and acronyms. Lowercase the word after a colon. Write `Agents and tool calling: what could go wrong?`, not `Agents and Tool Calling: What Could Go Wrong?`. This applies to quiz and question titles.

## The error-message round-trip

The import page and CI use the same error report format. Paste the report into an AI chat or use the paths and suggested fixes to edit the JSON yourself.

This broken quiz has a string `schemaVersion`, an uppercase question id, a missing `explanation`, and an invented `difficulty` field:

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

Paste the report into the AI chat that generated the quiz. Ask: "Fix these validation errors and return the full corrected JSON." Then validate the result again.

CI uses the same wording. This output came from a real pull request that omitted the required `description`:

```
Public quiz does not satisfy the Public catalog profile in content/quizzes/git-basics.json:

1. Problem at path: `description`
   Problem: The Public catalog profile requires a `description`.
   Fix: Add a short `description` explaining what the quiz covers and who it is for.

Public catalog profile check failed: 1 error(s), 0 warning(s) across 4 Quiz file(s) in content/quizzes.
```

Fix the reported errors. Validate again before you submit the quiz.
