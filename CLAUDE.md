Quizbun — static, explanation-first quiz catalog. Astro 7 static + React 19 islands on GitHub Pages. No backend: public quizzes in the repo, private quizzes in IndexedDB.

Docs are authoritative, in this order:

1. [CONTEXT.md](CONTEXT.md) — binding vocabulary; use these terms in code and prose.
2. [docs/description.md](docs/description.md) — product vision; wins on any conflict.
3. [SPEC.md](SPEC.md) — Standard, layer/slice inventory, routes, behavior, testing, deferred work.

## Commands

Bun; Node >= 22.12. Scripts live in `package.json` — `dev`, `build`, `check` (oxlint + oxfmt + Stylelint), `typecheck`, `check:astro`, `css:dts`, `schema:generate`/`schema:check`, `validate:docs-examples`, `validate:public-quizzes`, `test` (Vitest: `.spec.ts` unit + `.test.tsx` browser), `e2e` (Playwright, `e2e/*.e2e.ts` against `astro preview`).

## Rules

- GitHub Pages sets `GITHUB_PAGES=true` → Astro `base` is `/quizbun`. Never hardcode absolute site/asset paths.
- The Zod schema is the single source of truth for the Quiz Object Standard; `public/schema/quiz.v1.json` is generated from it. Unknown fields are errors. Validation messages are a product feature: path-precise and pasteable into an AI chat.
- The Standard carries no presentation fields. Option identity is JSON order; shuffling, labeling, and page size are Renderer behavior.
- Markdown goes through [markdown.ts](src/shared/lib/render/markdown.ts) (`marked` + `sanitize-html`); raw HTML is always stripped.
- v1 ships no visual design — semantic HTML, keyboard operability, responsive structure only.
- Code layout follows FSD: `app → pages (routes) → _pages → features → entities → shared`. `src/pages/` holds Astro route files only; no `widgets/` layer. See the `fsd-quizbun` skill.
- CSS Modules only (no Tailwind); semantic tokens only; theming via `light-dark()` + `<html data-theme>`. See the `css-modules` skill.
