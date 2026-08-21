# Quiz Object Standard

> [!IMPORTANT]
> **Frozen at v1.0; extended additively in v1.1.** Existing fields, required fields, constraints, and correctness semantics will not change. Version 1 may only grow by adding optional fields — v1.1 does exactly that with [Media](#media) — and any breaking change ships as `schemaVersion: 2`. A Quiz that validates today keeps validating.

This document is the normative reference for authors, AI generators, and Renderer authors. The Zod schema in `src/shared/lib/quiz/schema.ts` is the executable source of truth, and the published JSON Schema at `/schema/quiz.v1.json` is the generated companion artifact for tools. The import page and Zod validator are the final authority when JSON Schema cannot express a rule.

## Versioning and strictness

- `schemaVersion` is the integer `1`. Strings such as `"1"` or `"1.0"` are invalid.
- Unknown fields are invalid at every level: Quiz, Question, Option, and validation objects.
- The Standard contains content and correctness only. It never contains presentation fields such as page size, Option labels, shuffle settings, themes, or layout hints.
- Adding an optional field inside version 1 is allowed. Removing a field, changing required fields, tightening existing constraints, or changing correctness semantics requires `schemaVersion: 2`.
- **v1.1 is an additive revision, not a new version.** It adds the optional `images` and `videos` fields described under [Media](#media). The `schemaVersion` field stays the integer `1`, every pre-v1.1 Quiz still validates unchanged, and "v1.1" is a label for this document and the changelog only — it never appears in a Quiz. The one consequence: a copy of the published JSON Schema fetched before v1.1 rejects a Quiz that uses media, so tools that cache the artifact should refresh it.

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
| `images`      | no       | Array of Images shown with the prompt or the Explanation. See [Media](#media).                                                                         |
| `videos`      | no       | Array of Videos shown with the prompt or the Explanation. See [Media](#media).                                                                         |

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

## Media

A Question of any type may carry Images and Videos. Both fields are optional; when present, each must contain at least one item. Media is content, not decoration — everything the Standard says about presentation still holds, so there are no size, column, or alignment fields.

```json
{
  "id": "cache-hierarchy",
  "type": "single-choice",
  "title": "Which tier answers the repeat read?",
  "images": [
    {
      "src": "cache-tiers.svg",
      "alt": "Three-tier cache hierarchy with request arrows",
      "caption": "Diagram: J. Doe, CC-BY 4.0",
      "placement": "explanation"
    }
  ],
  "videos": [
    {
      "provider": "youtube",
      "id": "dQw4w9WgXcQ",
      "start": 90,
      "placement": "question"
    }
  ],
  "options": [],
  "explanation": "..."
}
```

| Field    | Required | Semantics                                                                               |
| -------- | -------- | --------------------------------------------------------------------------------------- |
| `images` | no       | Array of Images. Must contain at least one Image when present. Rendered in array order. |
| `videos` | no       | Array of Videos. Must contain at least one Video when present. Rendered in array order. |

### Images

| Field       | Required | Semantics                                                                                                           |
| ----------- | -------- | ------------------------------------------------------------------------------------------------------------------- |
| `src`       | yes      | Either a bare asset filename or an `https://` URL. See [Image sources](#image-sources).                             |
| `alt`       | yes      | Alternative text describing the Image's content. Must be a non-empty string after trimming.                         |
| `caption`   | no       | Short Markdown caption shown under the Image, and the natural home for attribution. Must be non-empty when present. |
| `placement` | no       | `"question"` or `"explanation"`. Absent means `"question"`.                                                         |

`alt` is required and has no empty escape hatch. A Question's Image is content that carries part of the teaching; it is never decorative, so there is never a reason to hide it from assistive technology.

#### Image sources

`src` has exactly two legal forms:

1. **A bare asset filename** — a kebab-case name plus an allowlisted extension: `png`, `jpg`, `jpeg`, `webp`, `avif`, `gif`, `svg`. For example `cache-tiers.svg` or `float-bits-2.png`. No directories, no `./` or `../` segments, no leading `/`. The filename names a file shipped alongside the Quiz; how a Renderer turns it into a URL is Renderer behavior, and the Quiz never encodes a folder layout.
2. **An `https://` URL** — for example `https://upload.wikimedia.org/example.png`.

Everything else is invalid: `http://` (use `https`), protocol-relative `//host/path`, `data:` URIs, and `file:` paths. Data URIs are deferred, not rejected on principle; accepting them later would be a loosening and therefore legal inside version 1.

Public catalog Quizzes are stricter than the Standard here: they may use bare filenames only, with the file vendored in the repository next to the Quiz. Remote images are for private Library Quizzes.

### Videos

| Field       | Required | Semantics                                                              |
| ----------- | -------- | ---------------------------------------------------------------------- |
| `provider`  | yes      | Must be `"youtube"`. It is the only provider in version 1.             |
| `id`        | yes      | The 11-character YouTube video id, such as `dQw4w9WgXcQ`. Never a URL. |
| `start`     | no       | Whole number of seconds, `0` or greater, to start playback at.         |
| `placement` | no       | `"question"` or `"explanation"`. Absent means `"question"`.            |

`videos` is an array even though one Video per Question is the common case: turning a single object into an array later would be a breaking shape change, so the array ships from the start. Adding a second provider later is a loosening and stays legal inside version 1.

### Placement

`placement` selects a surface, not a position:

- `"question"` — shown with the prompt, before the learner answers.
- `"explanation"` — revealed together with the Explanation, after submission. Use it for anything that would give the answer away.

Absent `placement` means `"question"`. The default is resolved by the Renderer and never written into the Quiz: a parsed Quiz that omitted `placement` still omits it, so Exports stay byte-faithful and Content hashes carry no field the author did not write. Two Questions that differ only by an explicit `"placement": "question"` are therefore different content with different hashes.

Any future `placement` value must name a surface. Values such as `explanation-top` would be layout smuggled into content and will not be added.

### Rendering and degradation

- Media never replaces text. A Question must still read correctly with every Image and Video removed.
- An Image whose `src` cannot be resolved or loaded degrades to its `alt` text. It is never a validation error and never blocks a Run — a missing file is a broken link, not an invalid Quiz.
- Validation is deterministic and offline. Neither the schema nor the import page fetches an image or checks that a YouTube id exists; they judge shape only. Repository CI enforces file existence for Public catalog Quizzes.

### One channel for media

The `images` and `videos` fields are the **only** way to put media in a Quiz. Markdown image syntax is inert everywhere (see [Markdown](#markdown)). This is deliberate: the validator is pure Zod over JSON and cannot police what is inside a Markdown string, so alt text, captions, and source policy would all become unenforceable the moment images could arrive through prose.

### Authoring media with AI

AI-authored media is welcome, including diagrams the model draws itself — an SVG generated for a Question is as legitimate as one a human drew. The single rule is that nothing may be fabricated: every `src` and every YouTube `id` must point at something verified to exist. Do not invent plausible-looking image URLs, do not guess video ids, and do not reference a filename you have not written. Verify before writing, because the Standard deliberately cannot verify for you.

## Correctness model

Every Question evaluates to exactly one binary result: correct or incorrect. Quizbun does not support points, weighting, partial credit, scoring configuration, or attempt history in version 1. A Summary reports `X of Y correct`.

A Renderer may prevent empty submissions for usability. The Standard itself defines correctness by comparison: because every choice Question has at least one correct Option, an empty set of selected Options cannot be correct.

## Renderer rules

Renderer behavior must preserve the Standard's content identity rules.

1. Saved choice answers reference Option indexes in the original JSON order, never the displayed order. If a Renderer shuffles Options, it must translate displayed positions back to original indexes before saving or checking answers.
2. Progress is keyed by Quiz `id` and Question `id`, and each saved Question answer is invalidated by a Content hash. If a Question's content changes during re-import, the saved answer for that Question is discarded while unchanged Questions may keep Progress.

Media adds four Renderer responsibilities:

3. **Placement resolution.** Media with `placement: "question"`, or with no `placement` at all, is shown between the Question `title` and its `description`. Media with `placement: "explanation"` is shown after the Explanation text and before References, revealed on submission. Within one surface, Images render in array order, then Videos.
4. **Source resolution.** An `https://` `src` is used as-is. A bare filename is resolved to wherever that Renderer serves a Quiz's assets from. Resolution never rewrites the Quiz: an Export reproduces the author's `src` exactly, because mutating it would change the Question's Content hash and discard the learner's Progress on re-import.
5. **Degradation.** An Image that fails to load renders as its `alt` text in place of the image.
6. **Layout.** Images render at their natural size, are never upscaled, are capped to the available width and a sensible maximum height, and wrap when a surface has several. Layout is chosen by the Renderer, never by the Quiz.

A Renderer must not contact a video provider before the learner asks it to. Quizbun renders a Video as a same-origin placeholder and only creates the provider iframe on an explicit click, so opening a Quiz makes no third-party request.

Shuffling, Option labels, pagination, Page size, keyboard controls, media layout, and the placement default are Renderer behavior. They must not be written into the Quiz object. If a Renderer shuffles Options during a Run, it should persist that Run's shuffle order so reloads remain stable.

## Markdown

Every text field is Markdown, rendered safely. Raw HTML is not supported and is stripped from rendered output.

Markdown image syntax is intentionally inert. Both `![alt](src)` and a raw `<img>` tag are dropped by the Renderer wherever they appear, including inside Explanations and References. Use the [`images` field](#media) instead; it is the only image channel, and unlike prose it can be validated.

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

### v1.1 additive revision

- Media lives on the Question only. Option images, quiz-level cover art, and quiz-level video are not in v1.1; each remains a legal additive extension later.
- Surfaces are chosen by one `placement` field rather than by separate fields such as `explanationImages`.
- `placement` has no schema-level default, so a Quiz that omits it keeps omitting it through parse and Export.
- `videos` is an array from the start, with `youtube` as the only provider.
- Image `src` has two forms — bare filename or `https://` URL. `http://`, protocol-relative, and `data:` sources are rejected.
- Neither `images` nor `videos` has a count cap; both must be non-empty when present.
- Images carry no `width`, `height`, `size`, or `columns`. Sizing and layout are Renderer behavior, exactly as with Page size.
- An unresolvable Image is a rendering degradation, not a validation error.

These are additive decisions inside version 1: they loosen what a valid Quiz may contain and never invalidate an existing one.

These decisions are part of frozen version 1. Changing any of them is a breaking change that requires `schemaVersion: 2`; the schema, JSON Schema artifact, examples, and this document always change together.
