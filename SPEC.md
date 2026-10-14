# Quizbun specification

Status: app v1.1.0 and standard v1.2 shipped. Quiz JSON still uses `schemaVersion: 1`.

Last updated: 2026-08-28

This file is the maintainer reference for Quizbun's product behavior, architecture, decisions, release state, and deferred work. It describes the system as it exists and replaces the earlier planning and decision documents.

Use these sources for exact rules:

- [CONTEXT.md](CONTEXT.md) defines the project's vocabulary.
- [docs/description.md](docs/description.md) defines the product vision and wins if product documents conflict.
- [src/shared/lib/quiz/schema.ts](src/shared/lib/quiz/schema.ts) is the executable source of truth for quiz validation.
- [docs/standard.md](docs/standard.md) is the normative Quiz Object Standard for authors and renderer implementers.

The app version, standard document revision, and `schemaVersion` are separate. App v1.1 added storage durability. Standard v1.1 added optional question media and v1.2 added optional image dimensions, both without breaking existing quiz JSON.

## 1. Product

Quizbun is a static, explanation-first quiz catalog for self-learners. It uses the versioned JSON Quiz Object Standard, which supports AI generation. The MIT-licensed site runs in the browser with no backend, accounts, or server-side runtime.

The core workflow has four steps:

1. Generate a quiz with an AI tool.
2. Import its JSON file or pasted JSON into Quizbun.
3. Learn from each explanation.
4. Resume or retake the run.

The same quiz JSON can be validated, reviewed in a pull request, and rendered by another application.

### Product principles

1. **Learning before testing.** Every submitted question reveals its explanation. Results stay binary because the explanation matters more than the score.
2. **Static catalog, local library.** The build bundles catalog quizzes. Imported quizzes and all runs stay in browser storage. Remote images may load from their declared URLs, and videos contact YouTube only after activation.
3. **One strict standard.** Minimal required fields and fixed defaults reduce invalid AI output. Unknown fields fail validation.
4. **Safe Markdown.** Quiz content uses Markdown. The renderer strips raw HTML and sanitizes the generated markup.
5. **Open contributions.** CI checks structure and schema. Reviewers check facts, clarity, and explanation quality. A merged quiz uses the repository's MIT license.
6. **Presentation-neutral content.** A quiz describes content and correctness, not layout, option labels, pagination, or themes.

### People

- A **learner** takes quizzes. The player is phone-first.
- A **creator** makes quizzes, usually with AI, and may keep them private.
- A **contributor** submits a quiz to the catalog through a pull request.

One person may fill every role. Quizbun has no user identity.

## 2. Quiz Object Standard

The standard defines one quiz as metadata plus an ordered list of questions. The site publishes the generated JSON Schema at `/schema/quiz.v1.json`. This section summarizes the frozen v1 contract and its additive revisions: v1.1 media and v1.2 image dimensions.

### Versioning and validation

- `schemaVersion` is the integer `1`. Strings such as `"1"` and `"1.0"` are invalid.
- Validation is strict on quiz, question, option, and validation objects. Unknown fields are errors.
- Errors include a precise path, problem, and suggested fix. [src/shared/lib/quiz/format-errors.ts](src/shared/lib/quiz/format-errors.ts) formats errors for import and CI.
- Version 1 may add optional fields. Removing a field, tightening a constraint, or changing correctness requires `schemaVersion: 2`.
- Standard v1.1 added optional `images` and `videos` arrays. Existing quiz JSON remains valid.
- Standard v1.2 added optional image `width` and `height`. These fields specify the referenced file's intrinsic dimensions in pixels. Both fields must appear together or remain absent. `quiz:sizes:generate` generates them. `quiz:sizes:check` checks them. Creators and models never type these values.

Existing quiz JSON remains valid.

### Quiz fields

| Field           | Required | Rule                                                                     |
| --------------- | -------- | ------------------------------------------------------------------------ |
| `schemaVersion` | yes      | Integer `1`                                                              |
| `id`            | yes      | Kebab-case slug with lowercase Latin letters, digits, and single hyphens |
| `title`         | yes      | Non-empty inline Markdown                                                |
| `questions`     | yes      | Ordered, non-empty array with unique question ids                        |
| `description`   | no       | Non-empty full Markdown                                                  |
| `language`      | no       | BCP 47-shaped tag such as `en` or `en-US`                                |
| `tags`          | no       | tag array, defaults to `[]`                                              |
| `author`        | no       | Non-empty free-form string, not an account                               |

Quiz `id` is the library primary key. Library and catalog use separate namespaces, so a private quiz may reuse a catalog id.

### Questions and answers

Every question has a kebab-case `id`, `title`, `type`, and `explanation`. The title asks the question. An optional `description` adds context but does not replace the title. Optional `description` and `references` fields use full Markdown. Optional media arrays must be non-empty. A question id is part of progress identity, so changing it creates a new question for storage.

Version 1 has three question types:

- `single-choice`
- `multiple-choice`
- `input`

Choice questions contain at least two `{ text, isCorrect }` options. Options have no ids or labels. Their identity is their index in the original JSON order.

- `single-choice` requires exactly one correct option.
- `multiple-choice` requires at least one correct option. All options may be correct. The submitted option set must match the correct set exactly.

Input questions use one validation mode:

- `text` compares submitted text with each accepted string. It trims, collapses whitespace, normalizes to Unicode NFC, and ignores case unless `caseSensitive` is `true`.
- `numeric` accepts finite JSON numbers. It allows `.` or `,` as the decimal separator, but not both. The answer is correct when its absolute difference from any accepted number is no greater than `tolerance`, which defaults to `0`.

Every question produces one correct or incorrect result. Version 1 has no points, weighting, partial credit, or run history. A summary reports `X of Y correct`.

Version 1 also fixes these constraints:

- A choice question needs at least two options.
- `multiple-choice` cannot express "select none" as correct.
- Fields and arrays have no hard maximum lengths beyond their non-empty requirements.
- Numeric accepted answers are JSON numbers, not numeric strings.

### Media

Any question may contain `images` and `videos`. Media exists only at question level.

An image is `{ src, alt, caption?, placement?, width?, height? }`. Its required `alt` text describes content. `caption` uses inline Markdown. `src` accepts either an `https://` URL or a bare kebab-case filename with a supported image extension. Directory segments, `http://`, protocol-relative URLs, and data URLs are invalid.

`width` and `height` specify the referenced file's intrinsic dimensions in pixels. Each value must be a whole number at or above one. Both fields must appear together. They let a renderer reserve space before the file loads. They never set the displayed size.

A video is `{ provider: "youtube", id, start?, placement? }`. The id is an 11-character YouTube video id. `start` is a whole number of seconds at or above zero.

Both media types accept `placement: "question" | "explanation"`. Missing placement means `question`, but the renderer does not write that default into the quiz. Question media appears between the title and description. Explanation media appears after the explanation and before references.

The renderer keeps image order, then video order. It never upscales images. Failed images show their alt text. Videos use a same-origin facade and create a `youtube-nocookie.com` iframe only after the learner activates it. Markdown image syntax remains inert.

Media is part of the content hash. Any media change invalidates that question's saved answer. Export preserves the original placement and source values.

Creators must check remote URLs and YouTube ids. CI checks catalog image files without making network requests.

### Markdown

Every text field uses Markdown. The renderer strips raw HTML.

- Short fields use inline Markdown: quiz titles, question titles, option text, and image captions.
- Long fields use full Markdown: descriptions, explanations, and references.

Fenced code highlighting supports JavaScript, TypeScript, JSX, TSX, JSON, HTML, CSS, Python, Bash, shell, and SQL. Unknown or missing language names render without highlighting.

### Renderer rules

Two rules preserve content identity across renderers:

1. Saved choice answers use original-order option indexes. A shuffled renderer must translate displayed positions before saving or checking an answer.
2. Progress uses quiz id, question id, and content hash. Re-import keeps an answer only when its question id and content hash still match.

Shuffling, option labels, pagination, page size, keyboard controls, and layout never belong in quiz JSON.

### Published artifacts and catalog profile

- `z.toJSONSchema()` generates [public/schema/quiz.v1.json](public/schema/quiz.v1.json). CI rejects drift from the Zod schema. Zod remains the final authority for cross-field rules that JSON Schema cannot fully express.
- Two Agent Skills ship from `skills/`. `create-quiz` writes and validates a quiz in the standard and stays renderer-neutral. Its generated files are `scripts/validate-quiz.mjs` and `references/quiz.v1.schema.json`. `quizbun` opens a quiz in Quizbun and requires `create-quiz`. Its generated file is `scripts/open-quiz.mjs`. `bun run skill:create-quiz:check` and `bun run skill:quizbun:check` reject drift in CI.
- The `create-quiz` skill owns the [AI generation prompt](skills/create-quiz/references/quiz-generation-prompt.md). The site renders that source with a short introduction.
- A separate ChatGPT plugin prototype lives in `plugins/quizbun/` and exposes two skills: `setup` and `create-quiz`. `setup` selects the destination. `create-quiz` combines authoring, validation, and the existing import UI with local browser tools. It supplies files when those tools are unavailable.
  - `bun run plugin:package` copies the standalone authoring resources, launcher, and icons into the plugin folder. It also builds a standard-profile-only validator, without `--profile catalog` and its Markdown stack, so every plugin file stays under the Claude directory's 256 KiB review limit. The copies are committed, so the folder is a complete plugin on `main`. It writes the ChatGPT ZIP to `public/plugins/chatgpt-plugin.zip` (git-ignored), so the site serves it at `/plugins/chatgpt-plugin.zip`. The standalone skills remain unchanged.
  - The plugin adds no MCP server or WebMCP tool.
  - `bun run plugin:check` checks assembled resource drift, the two-skill inventory, and both manifests. Actual ChatGPT activation and browser behavior require host acceptance testing. See [docs/plugins/chatgpt-plugin.md](docs/plugins/chatgpt-plugin.md).
  - The same folder is also a Claude Code plugin. `plugins/quizbun/.claude-plugin/plugin.json` is its manifest, and `.claude-plugin/marketplace.json` lists it. `bun run plugin:check` also makes sure that the name, version, description, and license match `plugin.json`. The root marketplace installs it from `./plugins/quizbun` on `main`, and Anthropic's directory reads the same folder. `plugins/.claude-plugin/marketplace.json` installs the local build. See [docs/plugins/claude-plugin.md](docs/plugins/claude-plugin.md).
- CI validates every file in [docs/examples](docs/examples) with the Zod schema.
- The public catalog profile adds repository-only rules. It requires `description`, `language`, at least one tag, repository-wide quiz id uniqueness, and a filename that matches the quiz id. Every catalog image also requires generated `width` and `height` that match the vendored file.
- The public catalog profile also enforces the import limits: at most 200 questions and 1 MB of JSON.
- The import limits and the quiz link are renderer behavior. They never belong in the schema, and the standard stays at `schemaVersion: 1`.
- Catalog titles use sentence case: only the first word and words that are always capitalized, such as names and acronyms, start with a capital. Human review and the PR checklist enforce it.

## 3. Architecture

Quizbun uses Astro 7 static output and React 19 islands. Bun manages packages. Node must be version 22.12 or newer. GitHub Pages hosts the build. JavaScript hydrates only interactive parts such as the player, import, library, tag filter, continue block, and copy-prompt control.

GitHub Pages serves `https://quizbun.fyi/` with Astro base `/`. Route and asset URLs use `withBase` or the documentation loader's rewriting.

### Code layout

The code follows Feature-Sliced Design:

- `src/app/` contains layouts and chrome used on every page.
- `src/pages/` contains Astro routes and required Astro endpoints only. Routes compose page slices and assign all `client:` directives.
- `src/_pages/` contains screen-specific React composition for `home`, `quizzes`, `quiz`, `library`, and `library-quiz`. Page slices do not import each other.
- `src/features/` contains user capabilities.
- `src/entities/quiz/` contains quiz metadata presentation.
- `src/shared/` contains cross-cutting code, styles, and UI components.

There is no `widgets/` layer. Add it only for a reusable multi-feature block that is not a page.

### Import limits and quiz link code

`src/shared/lib/quiz/import-limits.ts` holds the import limits (`MAX_IMPORT_QUESTIONS`, `MAX_IMPORT_BYTES`) and their reports. `src/shared/lib/quiz-link/` holds the quiz link codec. Both use only web-platform APIs. `scripts/quizbun-skill-cli.ts` bundles them into `skills/quizbun/scripts/open-quiz.mjs`, so the site, CI and the skill share one implementation.

### Catalog images

Each catalog quiz stores vendored images in `content/quizzes/{id}/` and refers to them by filename. [astro-quiz-assets.ts](astro-quiz-assets.ts) serves validated asset requests during development and copies assets to `dist/quiz-assets/{id}/` during a build. `withBase` produces the public URL.

The public catalog profile rejects remote images because they cause third-party requests and link rot. Videos remain remote and use the click-to-load facade.

Library imports accept both valid image source forms. A bare filename resolves to `{BASE_URL}quiz-assets/{quiz.id}/{filename}`. A missing file falls back to alt text. Import does not reject or rewrite the source because either action would break export round trips or change the content hash.

### Storage

IndexedDB stores library quizzes and runs. A library record wraps the original quiz as `{ quiz, importedAt }`. Export returns only the quiz.

The database stores one run per quiz and source. The key is `${source}:${quizId}`, where source is `catalog` or `library`. Each submitted answer records its content hash, submitted value, and correctness. A run also records `startedAt`, optional `finishedAt`, and `updatedAt`. Readers use `startedAt` when an older run lacks `updatedAt`.

The content hash is SHA-256 over a stable serialization of the whole question. Replacing a library quiz keeps answers whose question ids and hashes still match, then discards the rest.

`localStorage` holds page size, the selected voice URI, and storage-notice dismissal. Invalid values fall back to defaults.

#### Storage durability

The app shows durability advice only while browser storage is not persistent. It never reports a byte count because `estimate()` covers the whole origin and browsers may pad it.

The notice links to browser-specific installation instructions and offers an explicit request for persistent storage. In standalone mode, the app calls `persist()` automatically. The app registers no service worker because installability no longer requires one and offline support has not shipped.

The notice appears on Home and library because catalog runs and library quizzes share IndexedDB. `hasStoredData()` checks both stores. Home waits until data exists. Library may advise installation before the first import.

Dismissal has separate `nothing-stored` and `data-stored` states so an early dismissal expires once data exists.

### Private quiz routes

Library quiz ids do not exist at build time. Private detail pages therefore use the static shell `/library/quiz/?id={id}`. GitHub Pages cannot serve an arbitrary dynamic path.

Quizbun rejects two alternatives:

- A `404.html` rewrite would return a real 404 before client code corrected the route.
- Hash routing would add SPA routing to an otherwise static site.

Do not replace the query-param route without revisiting the GitHub Pages constraint.

### Documentation rendering

The site renders repository Markdown at build time through [src/shared/lib/docs](src/shared/lib/docs). The repository files remain canonical. The loader rewrites published documentation links for the deployment base and fails the build when a local link is missing.

The project rejected Astro content collections. The small documentation set needs link rewriting, not a second content source.

### Read aloud

Read aloud uses the browser's Web Speech API and lists only on-device English voices. It is off until the learner chooses a voice. The renderer speaks flattened explanation text and sends no quiz content to a speech service.

The footer picker and player are separate Astro islands. [src/shared/lib/speech](src/shared/lib/speech) stores the selection with `useSyncExternalStore`, `localStorage`, `voiceschanged`, and a same-tab `quizbun:voice-preference` event.

Cloud speech and automatic playback are out of scope because they would break the privacy and accessibility rules.

### Popup stacking

Base UI appends each popup portal to `document.body`. [src/shared/styles/global.css](src/shared/styles/global.css) assigns `[data-base-ui-portal] { z-index: 2 }`. This works because the body is a grid and static grid items honor `z-index`. The most recently opened portal paints last because portals share the same value and append in open order.

Popup transforms create their own stacking contexts, so popup-level `z-index` cannot order separate portals. Browser tests must assert visible paint order with `document.elementFromPoint`, not compare computed values.

Page content must keep unscoped `z-index` below `2`. The import form isolates its internal sticky toolbar. If the body stops using grid, move page content into an isolated wrapper and keep portals as its siblings.

## 4. Routes and behavior

| Route                             | Kind                  | Purpose                                       |
| --------------------------------- | --------------------- | --------------------------------------------- |
| `/`                               | static with islands   | Home, recent catalog quizzes, unfinished runs |
| `/quizzes/`, `/quizzes/page/{n}/` | static with island    | Paginated catalog and tag filter              |
| `/quizzes/{id}/`                  | static per quiz       | catalog quiz detail and player                |
| `/library/`                       | static shell, noindex | library list from IndexedDB                   |
| `/library/quiz/?id={id}`          | static shell, noindex | library quiz detail and player                |
| `/import/`                        | static with island    | import                                        |
| `/docs/` and child routes         | static                | Public documentation                          |
| `/docs/examples/{file}.json`      | static endpoint       | Canonical example download                    |
| `/schema/quiz.v1.json`            | static asset          | Published JSON Schema                         |

The sitemap omits library routes and `/quizzes/page/1/`. Page 1 uses `/quizzes/` as its canonical URL. Library routes emit `noindex` because their useful content exists only in IndexedDB.

Player links use real anchors with `rel="nofollow"`. They support deep links and modified clicks without asking crawlers to visit thousands of query-param copies of the same page.

### Home and catalog

Home explains Quizbun, lists the ten most recently added catalog quizzes, and shows up to five unfinished runs when any exist. The full catalog and tag filter live at `/quizzes/`.

The build derives quiz recency from each catalog file's first Git commit. Missing history falls back to the build time and emits a warning when more than half of the catalog uses the fallback. Equal dates sort by filename.

The continue block sorts runs by `updatedAt`, resolves them across both namespaces, and shows the first five valid entries. The continue block skips missing quizzes.

The tag filter stores a comma-separated `?tags=` value with `history.replaceState`. The tag filter ignores unknown tags.

Tag badges on quiz cards and quiz detail link to a list filtered to that one tag:

- Catalog quizzes link to `/quizzes/?tags={tag}`.
- Library quizzes link to `/library/?tags={tag}`.

The link replaces any current filter and lands on page 1. Import preview badges are not links.

### Player

The catalog and library use the same player with different quiz sources.

- Page size is `1`, `3`, `5`, or `10`, defaults to `5`, and may change during a run.
- Submission reveals correctness, explanation, optional media, and references. The question then locks for the run and saves immediately.
- Learners may visit pages in any order. Resume opens the first page with an unanswered question.
- Finish appears after the learner submits every question. Summary links back to each explanation. Retake replaces the run.
- Choice controls use the original option order in v1. Input questions share one answer-checking module.
- Every choice question shows an answer-count hint above its options. The `type` determines the hint: "Select one" or "Select all that apply". The option group references the hint with `aria-describedby`. The hint stays visible after submission, so learners can see the rule used to evaluate their answer. Quiz text never states this rule. See [docs/standard.md](docs/standard.md) renderer rules.
- Question media and explanation media follow the placement rules in section 2. Video activation moves focus to the created iframe.
- Read aloud appears after the learner selects a voice.

### Import, library, and quiz detail

Import uses one textarea. Paste, file selection, drag and drop, and a quiz link all fill it. Import runs its checks in this order: text size (1 MB of UTF-8), JSON parse, question count (200), then the schema. It then shows an editable error report or a preview, and saves the quiz only after an explicit click. An id collision requires an explicit replace or cancel choice.

A quiz link is `/import/#qos=1.<base64url(zlib deflate(UTF-8 JSON))>`. The `1.` versions the encoding, not the standard. Import reads the fragment once and calls `history.replaceState` to clear it, so the large URL stays out of history and a reload is safe. The decoder stops reading once the unpacked JSON passes 1 MB, which also defends against decompression bombs. A link never saves a quiz by itself.

Library lists, opens, exports, and deletes quizzes from IndexedDB. Deleting a quiz also deletes its run. The library and catalog use the same tag-filter feature with different data sources.

Quiz detail shows metadata, export, reset progress, a question preview, and a run-aware action. The action is Start, Continue, See summary, or retake. Public pages render a static Start fallback so the primary action exists before hydration.

Preview titles are real deep links into the player. Starting a run swaps the player into the same route. The `features/player` shell lazy-loads its runtime, which keeps question controls and summary code out of the initial detail bundle. Its loading frame retains the quiz title while a run loads. This code split reduced eager quiz-page JavaScript from 528 KB to 419 KB raw, and from 187 KB to 146 KB compressed.

Reset progress and retake both delete the saved run.

## 5. Catalog contributions

Catalog JSON lives in `content/quizzes/*.json`. A filename must match its quiz id. Quizzes with images store those files in `content/quizzes/{id}/`. The build fails on invalid content, duplicate ids, or filename mismatches.

[scripts/validate-public-quizzes.ts](scripts/validate-public-quizzes.ts) applies the public catalog profile. It also checks missing and orphaned assets, folder and filename rules, supported extensions, the 512,000-byte file limit, and recorded image dimensions against each vendored file. [docs/contributing.md](docs/contributing.md) documents the same rules.

The public documentation includes the standard, generation prompt, canonical examples, and contribution guide. The pull request template mirrors the automated checks. The root `CONTRIBUTING.md` points to the guide.

Human review checks facts, clarity, and whether each explanation teaches more than the correct answer. Media review also checks usefulness, placement, alt text, attribution, and remote ids.

Import and CI use the same error shape, so a contributor can paste the report back into an AI chat for correction.

## 6. Testing and CI

Vitest runs two projects under [vitest.config.ts](vitest.config.ts):

- Unit tests use `.spec.ts` in Node.
- Component tests use `.test.tsx` in real Chromium through `vitest-browser-react`.

Playwright runs `.e2e.ts` journeys in [e2e](e2e) against a root-base `astro preview` build. Each test gets fresh browser storage. Catalog tests derive mutable content from the rendered page instead of hardcoding quiz names.

The tests cover these journeys:

- Import through summary, catalog filtering, and every question type.
- Resume, library management, Page-size changes, and Content-hash invalidation.
- Media behavior, preview deep links, and keyboard and phone use.
- Theme behavior, install metadata, and storage notices.

A deploy-fidelity test covers root-path deep links.

Stryker runs mutation testing over the unit tests. [stryker.config.mjs](stryker.config.mjs) and [vitest.stryker.config.ts](vitest.stryker.config.ts) configure it. It finds tests that execute code without checking its behavior.

- `bun run test:mutation` tests everything in scope.
- `bun run mutate:file <glob>` tests one file.
- `bun run mutate:report` opens the HTML report.

Stryker is a local tool outside CI. It is slow, and its score is advisory. `thresholds.break` is `null`, so the score never fails a command. Files that unit tests do not reach appear as "no coverage", not as survivors. Component and e2e tests exercise those files instead.

Knip finds unused files, exports, and dependencies. [knip.json](knip.json) configures it. `bun run knip` reports findings. The repository is currently clean, so the command exits zero.

Knip is optional and outside CI. Its findings are advisory. The `src/**/index.ts` entry pattern excludes FSD slice public APIs from unused reports, even when nothing imports them yet. Knip ignores files under `.claude` and the generated `skills` bundle.

jscpd finds copied code. [.jscpd.json](.jscpd.json) configures it. It runs through `bunx` without being a dependency.

`bun run jscpd` scans `ts`, `tsx`, `astro`, `css`, and `mjs` sources at a 10-line / 60-token threshold. It writes HTML and JSON reports to `tmp/jscpd`. `bun run jscpd:report` opens the HTML report.

jscpd is optional and outside CI. Its findings are advisory. Nearly identical sibling components or CSS blocks containing only tokens are often duplication worth keeping.

The explanation/marking check evaluates whether a question's `explanation` supports the options marked `isCorrect`. Validation cannot express this relationship. Moving a flag to the wrong option changes meaning, not structure. The standard, public catalog profile, and Markdown audit therefore accept that change.

[scripts/check-explanation-marking.ts](scripts/check-explanation-marking.ts) implements the check. It sends one TypeSafe noul per choice question. The script reports questions with probabilities above `FLAG_THRESHOLD`.

Run `bun run quiz:explanations:check <quiz.json|dir>`. Add `--all` to display every probability for calibration.

This check is optional and outside CI. It requires `TYPESAFE_API_KEY` and network access. It bills per request. Its findings are advisory.

Calibration currently covers one quiz: [algorithms-you-already-ship-frontend](content/quizzes/algorithms-you-already-ship-frontend.json). Its 45 choice questions scored 0.020–0.050. A modified copy moved three `isCorrect` flags to wrong options and kept every explanation unchanged. Those questions scored 0.740–0.940. The 0.5 threshold lies between these ranges.

Check the whole catalog before relying on that threshold. The check finds a misplaced flag. It cannot detect a question whose explanation and marking are wrong together, because they remain internally consistent.

The repository patches `@stryker-mutator/vitest-runner` 10 in [patches](patches). The runner builds Vitest's `testNamePattern` by joining suite and test names with a space. Vitest 5 matches those names joined with `" > "`. Without the patch, every mutant runs zero tests and survives ([stryker-js#6210](https://github.com/stryker-mutator/stryker-js/issues/6210)). Remove the patch once the upstream release includes the fix.

[.github/workflows/ci.yml](.github/workflows/ci.yml) performs these checks:

- Regenerate CSS Module types.
- Type-check TypeScript and Astro.
- Run tests and linters.
- Validate documentation examples and catalog quizzes.
- Check generated artifacts.
- Build Astro.
- Check deployment-base paths.

Deploy waits for these checks.

While the repository is private, CI runs only through `workflow_dispatch`. Restore automatic push and pull request triggers when the repository becomes public.

## 7. Non-functional requirements

- Support current Chrome, Firefox, Safari, and Edge.
- Keep every page responsive. Design the player phone-first.
- Use semantic HTML. Support full keyboard operation. Provide visible focus and labeled controls. Use `fieldset` and `legend` for each question. Announce correctness with live regions. Handle dialog focus correctly. Target WCAG AA, but do not claim certification without an audit.
- Render build-time content statically. Hydrate only interactive islands. The player runtime remains lazy-loaded.
- Use `light-dark()` with `<html data-theme>` for theming. Components use semantic tokens and co-located CSS Modules.
- Keep the theme control two-state. `system` means no stored preference. Do not store a choice that matches the current system theme. Do not rewrite a stored choice when the system changes.

## 8. Release state

- The `v1.0.0` tag froze standard v1. Breaking changes now require `schemaVersion: 2`.
- App v1.1.0 added installation guidance and persistent browser storage for library and run durability.
- Standard v1.1 added question images and videos across schema, docs, validation, assets, rendering, and tests without changing `schemaVersion`.
- Standard v1.2 added optional image `width` and `height` across schema, docs, and the JSON Schema artifact, with `scripts/generate-quiz-image-sizes.ts` generating them. The pre-launch catalog migration wrote dimensions for 743 images across 726 questions in 55 quizzes. The public catalog profile verifies every pair against its vendored file.
- The production build targets the custom domain at the root path. Live GitHub Pages acceptance follows the domain cutover.

When the repository becomes public:

1. Restore automatic CI.
2. Deploy `main`.
3. Publish the release.
4. Run the full acceptance flow on the live URL.
5. Check validation on a pull request from a fork.

## 9. Deferred work

- Progress export and import across devices. This needs its own versioned format and merge rules.
- Run history and statistics.
- Partial credit and scoring.
- Raw HTML in quiz content.
- Structured author data and per-quiz licenses.
- Offline routing and caching.
- Interface localization.
- Option ids, presentation hints, and a richer taxonomy.
- Per-field length limits. The whole-quiz import limits already exist.
- Read aloud for non-English voices.
- More media sources, presentation fields, and video providers.
- Direct AI loading through an explicit local integration and permission model.

## 10. Risks

- The frozen standard makes late schema mistakes expensive. Existing fixtures, catalog generation, and schema drift checks reduce the risk.
- The live GitHub Pages path has not been exercised. Base-path builds and preview tests reduce the risk until deployment is possible.
- Strict validation can slow contributions. Precise, reusable error reports keep correction work small.
