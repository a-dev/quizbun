# Quiz Object Standard

This document is the normative reference for authors, AI generators, and renderer authors. The Zod schema in `src/shared/lib/quiz/schema.ts` is the executable source of truth. Tools can use the generated JSON Schema at `/schema/quiz.v1.json`. When JSON Schema cannot express a rule, the import page and Zod validator are the final authority.

## Compatibility and strictness

- `schemaVersion` is the integer `1`. Strings such as `"1"` or `"1.0"` are invalid.
- Unknown fields are invalid at every level: quiz, question, option, and validation objects.
- The standard contains content and correctness only. It never contains presentation fields such as page size, option labels, shuffle settings, themes, or layout hints.
- The standard allows new optional fields. Removing a field, changing required fields, tightening existing constraints, or changing correctness semantics requires `schemaVersion: 2`.

A quiz that validates today will keep validating. Keep cached JSON Schema copies current to recognize new optional fields.
The schema, generated JSON Schema, examples, and this document must always change together.

## Quiz

A quiz is one JSON object with metadata and an ordered list of questions.
The standard has no length caps for titles or option text and no count caps for tags or questions.
Non-empty string requirements and required non-empty arrays still apply.

| Field           | Required | Semantics                                                                                                              |
| --------------- | -------- | ---------------------------------------------------------------------------------------------------------------------- |
| `schemaVersion` | yes      | Must be the integer `1`.                                                                                               |
| `id`            | yes      | Stable quiz identifier. Use kebab-case with lowercase latin letters, digits, and single hyphens: `react-hooks-basics`. |
| `title`         | yes      | Short Markdown field naming the quiz. Must be a non-empty string after trimming.                                       |
| `description`   | no       | Long Markdown field describing the quiz. Must be non-empty when present.                                               |
| `language`      | no       | BCP-47-shaped content language tag such as `en` or `en-US`.                                                            |
| `tags`          | no       | Array of tags. Defaults to `[]` when omitted. Each tag uses the same kebab-case charset as `id`.                       |
| `author`        | no       | Free-form author string. Not an account id and not structured metadata. Must be non-empty when present.                |
| `questions`     | yes      | Ordered array of one or more questions. Question `id`s must be unique within this quiz.                                |

Quiz `id` is the library primary key for private quizzes. A private quiz may use the same `id` as a catalog quiz because the library and catalog are separate namespaces.

The public catalog profile is stricter than the standard. Only CI enforces it for repository content. Public catalog quizzes require `description`, `language`, at least one tag, and repo-wide quiz `id` uniqueness.

## Questions

Every question has common fields plus a type-specific body.

| Field         | Required | Semantics                                                                                                                                                                 |
| ------------- | -------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `id`          | yes      | Stable question identifier, unique within the quiz. Use the same kebab-case charset as quiz `id`.                                                                         |
| `title`       | yes      | Short Markdown prompt containing the question itself. It usually ends in `?` and must be a non-empty string after trimming.                                               |
| `description` | no       | Long Markdown with supporting context such as a scenario, code snippet, or constraints. It must never contain the question on its own and must be non-empty when present. |
| `explanation` | yes      | Long Markdown teaching text shown after submission regardless of correctness. Must be non-empty.                                                                          |
| `references`  | no       | Long Markdown content for links, citations, or further reading, shown after the explanation. Must be non-empty when present.                                              |
| `type`        | yes      | One of `single-choice`, `multiple-choice`, or `input`.                                                                                                                    |
| `images`      | no       | Array of images shown with the prompt or the explanation. See [Media](#media).                                                                                            |
| `videos`      | no       | Array of videos shown with the prompt or the explanation. See [Media](#media).                                                                                            |

Question `id` is part of progress identity. Changing it creates a new question from the renderer and storage perspective.

Renderers display the `title` prominently and the `description` as smaller secondary text. Put the question itself in `title`. Use `description` only for supporting context. The question must remain clear when the `description` is hidden.

Neither field states how many options the learner may select. The renderer must explain this rule from `type`. See [renderer rules](#renderer-rules).

A criterion that forms part of the question still belongs in the text. For example, "Select every commit `git log main..feature` lists" identifies the required commits. The instruction "(Select all that apply.)" only repeats the type.

### Choice questions

Choice questions use an `options` array. Each option is a bare object:

```json
{
  "text": "React state updates are scheduled",
  "isCorrect": true
}
```

| Field       | Required | Semantics                                                              |
| ----------- | -------- | ---------------------------------------------------------------------- |
| `text`      | yes      | Short Markdown option text. Must be a non-empty string after trimming. |
| `isCorrect` | yes      | Boolean correctness marker.                                            |

Rules:

- `options` must contain at least two options.
- Options have no ids and no labels. Identity is the option's index in the original JSON order.
- `single-choice` must have exactly one option with `isCorrect: true`.
- `multiple-choice` must have at least one option with `isCorrect: true`. All options may be correct.
- Choice correctness is binary. The submitted original-order option indexes must exactly match the correct original-order option indexes.
- Multiple-choice is all-or-nothing. There is no partial credit.

### Input questions

Input questions use a `validation` object. The standard supports `text` and `numeric` modes.

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

- Compare the submitted value against every accepted answer. Any match is correct.
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
- A submitted value is correct when `abs(submitted - acceptedAnswer) <= tolerance` for any accepted answer.

## Media

A question of any type may contain images and videos. Both fields are optional, but each must contain at least one item when present. Neither array has a count cap.

Media is content rather than decoration. The standard therefore has no display-size, column, or alignment fields. An image may record its intrinsic pixel size. A renderer can use this fact about the file to reserve space.

Intrinsic pixel size is not a layout instruction. See [image dimensions](#image-dimensions).

Media belongs to questions only. The standard has no option images, quiz cover art, or quiz videos.

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
      "placement": "explanation",
      "width": 720,
      "height": 540
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
| `images` | no       | Array of images. Must contain at least one image when present. Rendered in array order. |
| `videos` | no       | Array of videos. Must contain at least one video when present. Rendered in array order. |

### Images

| Field       | Required | Semantics                                                                                                                           |
| ----------- | -------- | ----------------------------------------------------------------------------------------------------------------------------------- |
| `src`       | yes      | Either a bare asset filename or an `https://` URL. See [image sources](#image-sources).                                             |
| `alt`       | yes      | Alternative text describing the image's content. Must be a non-empty string after trimming.                                         |
| `caption`   | no       | Short Markdown caption shown under the image. Use it for attribution. Must be non-empty when present.                               |
| `placement` | no       | `"question"` or `"explanation"`. Absent means `"question"`.                                                                         |
| `width`     | no       | Intrinsic pixel width of the file `src` names. Whole number, `1` or greater. See [image dimensions](#image-dimensions).             |
| `height`    | no       | Intrinsic pixel height of the file `src` names. Whole number, `1` or greater. Required whenever `width` is present, and vice versa. |

An image must contain non-empty `alt` text. A question's image carries part of the teaching, so it is never decorative or hidden from assistive technology.

#### Image sources

`src` has exactly two legal forms:

1. **A bare asset filename.** Use a kebab-case name with an allowlisted extension: `png`, `jpg`, `jpeg`, `webp`, `avif`, `gif`, or `svg`. Examples include `cache-tiers.svg` and `float-bits-2.png`. Do not use directories, `./` or `../` segments, or a leading `/`. The file ships alongside the quiz. The renderer decides how to turn its name into a URL, and the quiz never stores a folder layout.
2. **An `https://` URL.** For example, `https://upload.wikimedia.org/example.png`.

Everything else is invalid, including `http://` (use `https`), protocol-relative `//host/path`, `data:` URIs, and `file:` paths.

Public catalog quizzes follow stricter rules here. They may use bare filenames only. The repository must contain the file next to the quiz. Remote images are for private library quizzes.

#### Image dimensions

`width` and `height` record the intrinsic pixel size of the file that `src` names. A renderer can reserve the correct space before the image decodes. This prevents the page from shifting when the image arrives.

They are a fact about the referenced resource, exactly as `alt` is. They are not presentation instructions. The renderer still decides the displayed size. The renderer never increases an image beyond its natural size to match these dimensions.

The fields have no schema-level defaults. Record intrinsic facts about the referenced resource in the quiz.
The renderer computes presentation, including rendered HTML, layout, and thumbnails, at render or build time.

Three rules govern them:

1. **Both or neither.** A lone `width` reserves nothing, so it is invalid. Setting one field requires the other.
2. **Measured, never estimated.** The values must match the file. Wrong dimensions are worse than absent ones: the renderer reserves the wrong box, and the derived aspect ratio distorts the image. If you cannot measure the file, omit both fields. This is why they are optional. See [Authoring media with AI](#authoring-media-with-ai).
3. **Preserve omission.** Parsing and export preserve the absence of these fields, as they do for `placement`. Two questions that differ only by an explicit `width`/`height` pair are different content and have different Content hashes.

For an SVG, the intrinsic size is its `viewBox` extent, or its `width`/`height` attributes when those carry absolute units. An SVG scales without loss. The pair therefore defines an aspect ratio rather than a maximum.

In this repository, tooling generates the values. Authors do not type them.

- `bun run quiz:sizes:generate` reads every vendored asset and writes its dimensions into the quiz JSON.
- `bun run quiz:sizes:check` fails CI when a file and its recorded dimensions disagree.

### Videos

| Field       | Required | Semantics                                                              |
| ----------- | -------- | ---------------------------------------------------------------------- |
| `provider`  | yes      | Must be `"youtube"`. It is the only supported provider.                |
| `id`        | yes      | The 11-character YouTube video id, such as `dQw4w9WgXcQ`. Never a URL. |
| `start`     | no       | Whole number of seconds, `0` or greater, to start playback at.         |
| `placement` | no       | `"question"` or `"explanation"`. Absent means `"question"`.            |

`videos` is an array even though one video per question is the common case. Video dimensions belong to the provider’s player, not to the quiz.

### Placement

`placement` selects a surface rather than a position:

- `"question"`: shown with the prompt before the learner answers.
- `"explanation"`: revealed with the explanation after submission. Use it for anything that would give away the answer.

Absent `placement` means `"question"`. The renderer resolves this default without writing it into the quiz. A parsed quiz that omitted `placement` still omits it. Exports therefore stay byte-faithful. Content hashes contain no field that the author did not write. Two questions that differ only by an explicit `"placement": "question"` are different content and have different hashes.

Any future `placement` value must name a surface. Values such as `explanation-top` describe layout instead, so they will not be added.

### Rendering and degradation

- Media never replaces text. A question must still read correctly with every image and video removed.
- If an image cannot be resolved or loaded, the renderer displays its `alt` text. The failure never blocks a run or makes the quiz invalid. A missing file is a broken link.
- Validation is deterministic and offline. Neither the schema nor the import page fetches an image or checks that a YouTube id exists. They validate shape only. Repository CI enforces file existence for public catalog quizzes. The `create-quiz` skill's validator can resolve remote media on demand with `--check-media`, but that is an opt-in authoring step, not part of the standard.

### How to add media

The `images` and `videos` fields are the only way to put media in a quiz. Markdown image syntax is inert everywhere (see [Markdown](#markdown)). The validator uses Zod over JSON and cannot inspect media embedded in a Markdown string. Allowing images through prose would make alt text, captions, and the source policy impossible to enforce.

### Authoring media with AI

You can use AI-authored media, including diagrams generated by the model. An SVG generated for a question is as valid as one drawn by a person. Do not fabricate sources. Every `src` and YouTube `id` must identify a source that you checked.

- Do not invent plausible image URLs.
- Do not guess video ids.
- Do not reference a file that you did not write.

The standard cannot check these sources for you.

Do not fabricate dimensions either. `width` and `height` are optional so that a generator can omit them when it cannot measure the file. Estimated dimensions look valid, pass the schema, and then break the layout they were meant to protect. Omit them. Let tooling supply the dimensions.

## Correctness model

Every question has one binary result: correct or incorrect. The standard does not support points, weighting, partial credit, scoring configuration, or attempt history. A summary reports `X of Y correct`.

A renderer may prevent empty submissions for usability. The standard defines correctness by comparison. Because every choice question has at least one correct option, an empty selection cannot be correct.

## Renderer rules

Renderer behavior must preserve the standard's content identity rules. A renderer may refuse quizzes above its own size limits. This does not make the quiz invalid.

1. Saved choice answers reference option indexes in the original JSON order, never the displayed order. If a renderer shuffles options, it must translate displayed positions back to original indexes before saving or checking answers.
2. The renderer identifies progress by quiz `id` and question `id`. It uses a content hash to invalidate each saved question answer. If a question's content changes during re-import, the renderer discards its saved answer. Unchanged questions may keep progress.

Media adds five renderer responsibilities:

3. **Placement resolution.** The renderer displays media between the question `title` and `description` when `placement` is `"question"` or absent. It reveals media with `placement: "explanation"` on submission, after the explanation text and before references. Within one surface, images render in array order, then videos.
4. **Source resolution.** The renderer uses an `https://` `src` as written. The renderer resolves a bare filename against the location where it serves the quiz assets. Resolution never rewrites the quiz. An export reproduces the author's `src` exactly. Changing it would change the question's content hash and discard the learner's progress on re-import.
5. **Degradation.** An image that fails to load renders as its `alt` text in place of the image.
6. **Layout.** The renderer displays images at their natural size or smaller. It limits them to the available width and a sensible maximum height. Several images on the same surface wrap as needed. The renderer chooses the layout, never the quiz.
7. **Space reservation.** When an image contains `width` and `height`, the renderer reserves space from those dimensions before the file loads. This prevents arriving media from moving content. The renderer must still limit the image to the available space. It must not simply display the image at the recorded size. When the fields are absent, it must use a placeholder with bounded dimensions.

A renderer must not contact a video provider before the learner asks it to. Quizbun displays a video as a same-origin placeholder. It creates the provider iframe only on an explicit click. Opening a quiz therefore makes no third-party request.

Shuffling, option labels, pagination, page size, keyboard controls, media layout, and the placement default are renderer behavior. The renderer must not write them into the quiz object. If a renderer shuffles options during a run, it should persist that run's shuffle order so reloads remain stable.

A renderer must also tell the learner how many options a choice question accepts. It derives this rule from `type`. Control shape alone does not explain the rule. A radio button and a checkbox differ by only a few pixels at their corners. The `multiple-choice` type requires an exact set match, which neither control shape explains.

The quiz never states this rule. A renderer that omits it leaves the learner guessing. Quizbun displays "Select one" and "Select all that apply" above the options. It keeps the instruction visible after submission. A reviewed answer therefore still displays the rule that determined correctness.

## Markdown

Every text field is Markdown. The renderer renders it safely and removes raw HTML from the output.

Markdown image syntax is intentionally inert. The renderer removes both `![alt](src)` and raw `<img>` tags wherever they appear, including inside explanations and references. Use the [`images` field](#media) instead. It is the only image channel. The validator can validate this field, unlike prose.

The renderer uses two tiers:

- Short fields are inline-only: quiz `title`, question `title`, option `text`, and image `caption`.
- Long fields allow full Markdown: quiz `description`, question `description`, explanation, and references.

Inline-only is a rendering rule, not an import-time validation rule. If a short field contains block Markdown, the renderer flattens or degrades it instead of rejecting the quiz. In contexts that cannot render Markdown, such as the browser tab title or compact lists, the renderer strips formatting to plain text.

### Code blocks

Long fields may use fenced code blocks. The renderer applies syntax highlighting for a fixed set of languages, selected by the fence info string:

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

Any other info string, or none at all, renders as a plain code block without syntax highlighting. It is never an error. Highlighting belongs to the renderer, not the quiz. The info string is ordinary Markdown, and the highlighter adds no fields to the standard.

## Revision history

- **1.0:** Established the standard.
- **1.1:** Added optional question images and videos.
- **1.2:** Added optional intrinsic image dimensions (`width` and `height`).

All revisions use `schemaVersion: 1`. The additions preserve existing valid quizzes.
