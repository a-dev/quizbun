Quizbun is a static, explanation-first quiz catalog for self-learners, built around a versioned JSON quiz format ("the Quiz Object Standard") designed for AI generation. Astro 7 static output with React 19 islands, deployed to GitHub Pages. No backend, no accounts: public quizzes live in the repo and build statically; private quizzes live in the browser (IndexedDB), imported as JSON.

The project is **documentation-driven**: public author/contributor docs live in `docs/`; developer planning and architecture docs live in `dev-docs/`. The documents are the source of authority and drive implementation, in this order:

1. [CONTEXT.md](CONTEXT.md) — the **ubiquitous language**. Binding vocabulary (Quiz, Question, Option, Run, Library, Catalog, Explanation, Content hash, …). Use these terms exactly, in code identifiers and in prose; each entry lists terms to avoid.
2. [docs/idea.md](docs/idea.md) — product vision and design rationale. **Wins on any conflict** with other docs.
3. [dev-docs/PRD.md](dev-docs/PRD.md) — the consolidated **product & architecture reference** for the current (v1.0, frozen) state: the Standard, architecture and code layout, every load-bearing decision (e.g. private quizzes use query-param routes like `/library/quiz/?id={id}` on a static shell, never dynamic paths), surfaces and routes, the contribution pipeline, testing/CI, and what remains open. Self-contained; it replaces the former per-milestone build plans and ADRs.

v1 explicitly ships **no visual design** — semantic HTML, keyboard operability, and responsive structure are required from the start; styling polish is a later phase.

## Commands

Bun is the package manager (`bun.lock`); Node >= 22.12.

- `bun run dev` / `bun run build` / `bun run preview` — Astro dev server / production build / preview
- `bun run check` — oxlint + oxfmt (including import sorting) + Stylelint autofix; `bun run lint` (oxlint --fix) and `bun run format` individually
- `bun run typecheck` — `tsc --noEmit`; `bun run check:astro` — `astro check`, covers diagnostics inside `.astro` templates that `tsc` doesn't see
- `bun run stylelint` — lint CSS files and Astro `<style>` blocks
- `bun run css:dts` — regenerate `.d.ts` typings for CSS Modules
- `bun run storybook` — Storybook on port 6006
- `bun run validate:docs-examples [path]` — validate canonical example quizzes in `docs/examples/` against the base Standard schema; accepts a single file or the whole directory
- `bun run validate:public-quizzes` — validate public Catalog quizzes in `content/quizzes/` against the Standard plus the Public catalog profile (filename = `id`, repo-wide-unique `id`, required `description`/`language`/≥1 tag). Both validators reuse the same Zod schema and error formatter as the import page
- `bun run schema:generate` / `bun run schema:check` — regenerate `public/schema/quiz.v1.json` from the Zod schema, and fail if the committed artifact has drifted

Tests run on **Vitest** (consolidated from `bun test`), in three lanes:

- `bun run test` — unit (`.spec.ts`, Node environment) **and** component (`.test.tsx`, real Chromium via `vitest-browser-react`) projects; `bun run test:unit` / `bun run test:browser` run one lane, `bun run test:watch` for watch mode
- `bun run e2e` — Playwright user-journey tests in `e2e/` (`.e2e.ts` suffix), driven against the static `astro preview` build with relative navigation. Covered journeys and the one open spec are summarized in [dev-docs/PRD.md](dev-docs/PRD.md) §7.

GitHub Pages builds set `GITHUB_PAGES=true`, which switches the Astro `base` to `/quizbun` — never hardcode absolute paths to site routes or assets.

## Architecture

- **The Standard is the core artifact.** A strict Zod schema (single source of truth, unknown fields are errors, integer `schemaVersion`) from which the published JSON Schema is generated via `z.toJSONSchema()`. Validation error messages are a product feature: path-precise and actionable enough to paste back into an AI chat. Canonical example quizzes live in `docs/examples/` and are validated in CI.
- **Content vs. Renderer split:** the Standard carries no presentation fields. Option identity is original JSON order (no ids/labels); shuffling, option labeling, and pagination ("Page size") are Renderer behavior.
- **Storage:** quizzes and Runs in IndexedDB; UI preferences (e.g. Page size) in localStorage. Exactly one saved Run per quiz; per-Question progress is invalidated by Content hash when a quiz is re-imported.
- **Markdown:** two-tier rendering via `marked` + `sanitize-html` ([src/shared/lib/render/markdown.ts](src/shared/lib/render/markdown.ts)) — inline-only for short fields, full Markdown for long fields; raw HTML is always stripped.
- **Code layout** follows Feature-Sliced Design — `app → pages (routes) → _pages (page slices) → features → entities → shared`; the `fsd` skill in `.claude/skills/` encodes the rules. `src/pages/` holds **only Astro route files** — `.astro` pages plus the few Astro endpoints that must be `.ts` (e.g. `docs/examples/[file].ts`); no React components, hooks, or page-private `_`-glue. Routes and the React page slices in `src/_pages/` (imported as `@/_pages/<slice>`; today: `home`, `quizzes`, `quiz`, `library`, `library-quiz`) together form the pages layer: the slice exports the screen's parts, while the route stays the hydration orchestrator and assigns all `client:` directives. Page slices never import each other. There is **no `widgets/` layer** — recreate it only for a true widget (a reusable multi-feature block that isn't itself a page). Layouts (the root shell, `docs-layout`) and the every-page chrome (header, footer, theme, voice picker) live in `src/app/`, referenced only by app layouts.

## CSS

Conventions are documented and enforced via the `css-modules-quizbun` skill ([.claude/skills/css-modules-quizbun/SKILL.md](.claude/skills/css-modules-quizbun/SKILL.md)). Key rules:

- CSS Modules co-located with components; no Tailwind. `localsConvention: camelCaseOnly`.
- Two-tier tokens in `src/shared/styles/vars/`: primitive palette (`palette.css`) → semantic tokens (`colors.css`, `fonts.css`, …). Components consume **semantic tokens only** — raw palette tokens or hex/oklch values in component modules are forbidden.
- Theming exclusively via `light-dark()` with `<html data-theme>`; no other theming mechanism.
- Shared style modules (`layout`, `typography`, `utils`) and helpers (`cx`, `cssVars`) are exported from `src/shared/styles/index.ts`.
