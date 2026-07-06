# Quiz Object Standard

> [!IMPORTANT]
> **Frozen at v1.0.** Existing fields, required fields, constraints, and correctness semantics will not change. Version 1 may only grow by adding optional fields; any breaking change ships as `schemaVersion: 2`. A Quiz that validates today keeps validating.

This document is the normative reference for authors, AI generators, and Renderer authors. The Zod schema in `src/shared/lib/quiz/schema.ts` is the executable source of truth, and the published JSON Schema at `/schema/quiz.v1.json` is the generated companion artifact for tools. The import page and Zod validator are the final authority when JSON Schema cannot express a rule.

## Versioning and strictness

- `schemaVersion` is the integer `1`. Strings such as `"1"` or `"1.0"` are invalid.
- Unknown fields are invalid at every level: Quiz, Question, Option, and validation objects.
- The Standard contains content and correctness only. It never contains presentation fields such as page size, Option labels, shuffle settings, themes, or layout hints.
- Adding an optional field inside version 1 is allowed. Removing a field, changing required fields, tightening existing constraints, or changing correctness semantics requires `schemaVersion: 2`.

## Quiz

A Quiz is one JSON object with metadata and an ordered list of Questions.

| Field           | Required | Semantics                                                                                                              |
| --------------- | -------- | ---------------------------------------------------------------------------------------------------------------------- |
| `schemaVersion` | yes      | Must be the integer `1`.                                                                                               |
| `id`            | yes      | Stable Quiz identifier. Use kebab-case with lowercase latin letters, digits, and single hyphens: `react-hooks-basics`. |
| `title`         | yes      | Short Markdown field naming the Quiz. Must be a non-empty string after trimming.                                       |
| `description`   | no       | Long Markdown field describing the Quiz. Must be non-empty when present.                                               |
| `language`      | no       | BCP-47-shaped content language tag such as `en` or `en-US`.                                                            |
| `tags`          | no       | Array of Tags. Defaults to `[]` when omitted. Each Tag uses the same kebab-case charset as `id`.                       |
| `author`        | no       | Free-form author string. Not an account id and not structured metadata. Must be non-empty when present.                |
| `questions`     | yes      | Ordered array of one or more Questions. Question `id`s must be unique within this Quiz.                                |

Quiz `id` is the Library primary key for private Quizzes. A private Quiz may use the same `id` as a Catalog Quiz because the Library and Catalog are separate namespaces.

The Public catalog profile is stricter than the Standard and is enforced only in CI for repository content. Public catalog Quizzes require `description`, `language`, at least one Tag, and repo-wide Quiz `id` uniqueness.

## Questions

Every Question has common fields plus a type-specific body.

| Field         | Required | Semantics                                                                                                                                              |
| ------------- | -------- | ------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `id`          | yes      | Stable Question identifier, unique within the Quiz. Use the same kebab-case charset as Quiz `id`.                                                      |
| `title`       | yes      | Short Markdown prompt carrying the question itself — the actual ask, usually ending in `?`. Must be a non-empty string after trimming.                 |
| `description` | no       | Long Markdown supporting context for the prompt: a scenario, code snippet, or constraints — never the question itself. Must be non-empty when present. |
| `explanation` | yes      | Long Markdown teaching text shown after submission regardless of correctness. Must be non-empty.                                                       |
| `references`  | no       | Long Markdown content for links, citations, or further reading, shown after the Explanation. Must be non-empty when present.                           |
| `type`        | yes      | One of `single-choice`, `multiple-choice`, or `input`.                                                                                                 |

Question `id` is part of Progress identity. Changing it creates a new Question from the Renderer and storage perspective.

Renderers display the `title` prominently and the `description` as smaller secondary text. Put the question itself in `title` and use `description` only for supporting context; the Question's ask must still be clear with the `description` hidden.

### Choice Questions

Choice Questions use an `options` array. Each Option is a bare object:

```json
{
  "text": "React state updates are scheduled",
  "isCorrect": true
}
```

| Field       | Required | Semantics                                                              |
| ----------- | -------- | ---------------------------------------------------------------------- |
| `text`      | yes      | Short Markdown Option text. Must be a non-empty string after trimming. |
| `isCorrect` | yes      | Boolean correctness marker.                                            |

Rules:

- `options` must contain at least two Options.
- Options have no ids and no labels. Identity is the Option's index in the original JSON order.
- `single-choice` must have exactly one Option with `isCorrect: true`.
- `multiple-choice` must have at least one Option with `isCorrect: true`; all Options may be correct.
- Choice correctness is binary. The submitted original-order Option indexes must exactly match the correct original-order Option indexes.
- Multiple-choice is all-or-nothing. There is no partial credit in version 1.

### Input Questions

Input Questions use a `validation` object. Version 1 supports `text` and `numeric` modes.

#### Text validation

```json
{
  "mode": "text",
  "acceptedAnswers": ["first conditional"],
  "caseSensitive": false
}
```

| Field             | Required | Semantics                                                                                                     |
| ----------------- | -------- | ------------------------------------------------------------------------------------------------------------- |
| `mode`            | yes      | Must be `"text"`.                                                                                             |
| `acceptedAnswers` | yes      | One or more non-empty strings.                                                                                |
| `caseSensitive`   | no       | Defaults to `false`. When `true`, case must match after trimming, whitespace collapse, and NFC normalization. |

Text matching rules:

- Compare the submitted value against every Accepted answer. Any match is correct.
- Trim leading and trailing whitespace from both sides.
- Collapse each internal run of whitespace to one ASCII space.
- Normalize both sides to Unicode NFC.
- Unless `caseSensitive` is `true`, compare case-insensitively after the previous normalization steps.

#### Numeric validation

```json
{
  "mode": "numeric",
  "acceptedAnswers": [3.14],
  "tolerance": 0.01
}
```

| Field             | Required | Semantics                                                     |
| ----------------- | -------- | ------------------------------------------------------------- |
| `mode`            | yes      | Must be `"numeric"`.                                          |
| `acceptedAnswers` | yes      | One or more finite JSON numbers. Numeric strings are invalid. |
| `tolerance`       | no       | Finite number greater than or equal to `0`. Defaults to `0`.  |

Numeric matching rules:

- Trim the submitted string before parsing.
- Accept `.` or `,` as the decimal separator. A value may not use both separators.
- Thousands separators are not supported.
- The parsed value must be finite.
- A submitted value is correct when `abs(submitted - acceptedAnswer) <= tolerance` for any Accepted answer.

## Correctness model

Every Question evaluates to exactly one binary result: correct or incorrect. Quizbun does not support points, weighting, partial credit, scoring configuration, or attempt history in version 1. A Summary reports `X of Y correct`.

A Renderer may prevent empty submissions for usability. The Standard itself defines correctness by comparison: because every choice Question has at least one correct Option, an empty set of selected Options cannot be correct.

## Renderer rules

Renderer behavior must preserve the Standard's content identity rules.

1. Saved choice answers reference Option indexes in the original JSON order, never the displayed order. If a Renderer shuffles Options, it must translate displayed positions back to original indexes before saving or checking answers.
2. Progress is keyed by Quiz `id` and Question `id`, and each saved Question answer is invalidated by a Content hash. If a Question's content changes during re-import, the saved answer for that Question is discarded while unchanged Questions may keep Progress.

Shuffling, Option labels, pagination, Page size, keyboard controls, and layout are Renderer behavior. They must not be written into the Quiz object. If a Renderer shuffles Options during a Run, it should persist that Run's shuffle order so reloads remain stable.

## Markdown

Every text field is Markdown, rendered safely. Raw HTML is not supported and is stripped from rendered output.

The Renderer uses two tiers:

- Short fields are inline-only: Quiz `title`, Question `title`, and Option `text`.
- Long fields allow full Markdown: Quiz `description`, Question `description`, Explanation, and References.

Inline-only is a rendering rule, not an import-time validation rule. If a short field contains block Markdown, the Renderer flattens or degrades it instead of rejecting the Quiz. In contexts that cannot render Markdown, such as the browser tab title or compact lists, the Renderer strips formatting to plain text.

### Code blocks

Long fields may use fenced code blocks. The Renderer applies syntax highlighting for a fixed set of languages, selected by the fence info string:

| Language     | Fence info string     |
| ------------ | --------------------- |
| JavaScript   | `js`, `javascript`    |
| TypeScript   | `ts`, `typescript`    |
| JSX          | `jsx`                 |
| TSX          | `tsx`                 |
| JSON         | `json`                |
| HTML         | `html`                |
| CSS          | `css`                 |
| Python       | `py`, `python`        |
| Bash / Shell | `bash`, `sh`, `shell` |
| SQL          | `sql`                 |

Any other info string, or none at all, renders as a plain un-highlighted code block; it is never an error. Highlighting is Renderer presentation, not Quiz content: the info string is ordinary Markdown and the highlighter adds no fields to the Standard.

## Resolved micro-decisions for version 1

- Choice Questions require at least two Options.
- `multiple-choice` requires at least one correct Option; all Options correct is valid.
- Version 1 has no hard length caps for titles, Option text, Tag count, or Question count beyond non-empty strings and required non-empty arrays. Tightening caps later would be breaking.
- Numeric `acceptedAnswers` are JSON numbers only. Numeric strings are invalid.

These decisions are part of frozen version 1. Changing any of them is a breaking change that requires `schemaVersion: 2`; the schema, JSON Schema artifact, examples, and this document always change together.
