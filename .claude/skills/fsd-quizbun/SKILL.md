---
name: fsd-quizbun
description: >
  Quizbun project-specific Feature-Sliced Design rules for src. Use when
  deciding where code belongs across app/pages/_pages/features/entities/
  shared, creating or moving a slice, adding an index.ts public API, placing a
  test or story, or reviewing structure for FSD compliance. This is the local
  overlay; the official methodology is the feature-sliced-design skill, and
  the project authority for the live layer/slice inventory is
  dev-docs/PRD.md §4.
---

# FSD in Quizbun

Official methodology: the `feature-sliced-design` skill. Current layers and
live slices: `dev-docs/PRD.md` §4. Static Astro 6 output with React 19
islands — no SPA router, no providers.

## Layers (import only downward)

```text
app → pages(routes) → _pages(page slices) → features → entities → shared
```

- **`app/` holds the shell: layouts + chrome.** Layouts: `layout.astro`
  (root shell) and `docs-layout.astro`. Chrome (`ui/`: header,
  theme-switcher, footer, voice-picker; `lib/`: theme-preference) is
  referenced **only by app layouts**, via relative imports — the first
  consumer outside `app/` demotes the component to a then-recreated
  widgets layer. One accepted upward edge: route files import
  `@/app/layout.astro` — Astro's layout pattern, not a violation to fix.
- **Routes in `src/pages/` + slices in `src/_pages/` together form the
  pages layer.** `src/pages/` stays `.astro`-only: route files plus the
  few endpoints that must be `.ts` (`docs/examples/[file].ts`). No React
  components, no hooks, no page-private glue files (no `_`/`-` prefixes).
  The underscore in `src/_pages/` is conventional (the official FSD-Astro
  pattern), not an Astro mechanism.
- **Route composes; slice exports parts.** A page slice exports the
  screen's parts; the `.astro` route remains the hydration orchestrator
  and assigns **all** `client:` directives. Never export a whole-page
  React component that would force all-or-nothing hydration.
- **A page slice exists only when a route needs page-specific React/model
  code.** Thin routes (`import.astro`, `docs/*`) keep mounting
  features/shared directly. Slice names mirror the URL surface: `home`,
  `quizzes`, `quiz`, `library`, `library-quiz`.
- **Page slices never import each other.** Small glue shared between two
  page slices is duplicated into each (`render-player.tsx` lives in both
  quiz-screen slices by design) — the only shared home would re-create the
  widget layer.
- **There is no `widgets/` layer.** Recreate it only when a true widget
  appears: a reusable block with limited business logic that composes
  features/entities and is not itself a page.
- **Single-use features are normal here.** Official FSD says "keep code in
  pages, extract at 2+ reuse" — but a route cannot hold React, so a
  capability that is not a whole screen goes to `features/` even with one
  consumer (`import-quiz`, `continue-runs`, `copy-prompt`). Whole-screen
  compositions are `_pages/` slices, not features.
- **`entities/` at real 2+ reuse only, never speculatively.** Resident:
  `quiz` (QuizCard metadata presentation — consumed by the `quizzes` and
  `library` page slices, `import-quiz`, `continue-runs`, and the Home
  route).

## Slice shape

```text
<layer>/<slice>/
  index.ts           ← public API of React slices; named exports only
  ui/ model/ lib/    ← segments are the default for new slices
```

- Import a React slice by its root only: `@/features/player` or
  `@/_pages/quizzes` (plain `@/*` alias — no dedicated `_pages` alias),
  never `@/features/player/ui/player`. No sub-slice `index.ts`; inside a
  slice, relative imports.
- A small slice may stay flat (`continue-runs` is); introduce segments as
  it grows rather than nesting one file per segment.
- **`.astro` exception:** `.ts` barrels re-export only TS/TSX — Astro
  components can't be barreled through `.ts`. The app chrome is `.astro`,
  so it has no `index.ts`; app layouts import chrome files by relative
  path (`./ui/header.astro`).
- `shared/` has no slices → public API per segment/topic:
  `@/shared/ui/button`, `@/shared/lib/quiz`, `#styles`
  (= `shared/styles/index.ts`). `shared/lib/` groups by topic (quiz,
  storage, render, content, docs, speech, routing, errors), one `index.ts`
  each.
- Same-layer cross-imports: none are accepted; push shared logic down (or,
  between page slices only, duplicate — see above).

## Naming & exports

- Files always kebab-case; hooks `use-*.ts`; components PascalCase in a
  kebab file. Prefer domain-based names (`content-hash.ts`,
  `validate-quiz-json.ts`); technical-role names (`types.ts`) allowed but
  discouraged.
- `index.ts` exports are **named, never default**.
- CSS Modules co-located with a generated, git-ignored `*.module.css.d.ts`
  (`bun run css:dts`); styling rules live in the `css-modules-quizbun` skill.

## Tests & stories (extension picks the lane)

- **Co-locate** beside the file under test. No `__tests__/` dirs, no jsdom.
- `*.spec.ts` → Vitest unit lane, **Node** environment (pure logic)
- `*.test.{ts,tsx}` → Vitest browser lane, real Chromium via
  `vitest-browser-react`
- `e2e/*.e2e.ts` → Playwright user journeys against the built site
  (`astro preview`, port 4325)
- `*.stories.tsx` → Storybook, co-located (today: `shared/ui`)
- Default to `.spec.ts`; use `.test.tsx` only when real rendering is
  genuinely required.

## Before you finish

Sanity-check structure changes against the import graph: downward only,
slice roots only, the exceptions above excepted. Oxlint enforces the
`_pages` boundaries (`no-restricted-imports`): no `@/_pages` from
features/entities/shared or between page slices, no deep `@/_pages/*/…`
segment imports from anywhere. If you broke a rule on purpose, say so and
note why (comment or PR description).
