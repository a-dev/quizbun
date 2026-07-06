---
name: css-modules-quizbun
description: Quizbun CSS Modules conventions. Use for *.module.css edits, Astro <style> blocks, shared style or token files under src/shared/styles/, and TSX changes that alter visual styling through className, cssVars-style inline custom properties, composes, or data-*/aria-* variants. Trigger on requests like "style this component", "add a primary variant", "make it dark-mode aware", "add a loading state", or "new button/card", including one-line TSX edits when they change styling or class composition.
---

# CSS convention

This skill is the single source of truth for Quizbun's CSS conventions: the non-negotiable rules to apply automatically, plus the reference material (token files, theming mechanics, shared modules, lint scope) at the end.

## When this skill is active

- A `*.module.css` file (component-local or shared).
- A token / global file under `src/shared/styles/`.
- TSX that sets `className`, `style`, `data-*` variant attributes, or composes classes.
- Astro `<style>` blocks in `src/app/` or `src/pages/` — same token, theming, and naming rules; scoped styles instead of modules.

Pure logic changes (no styles, no className, no variant attributes) → skill does not apply.

## Non-negotiable rules

### 1. No Tailwind. No inline visual `style`

Visual properties live in `*.module.css`. Inline `style` only sets CSS custom properties via the `cssVars()` helper (Pattern B). Anything else bypasses cascade layers.

### 2. Class names: kebab-case in CSS, camelCase in TSX

`localsConvention: 'camelCaseOnly'` (set in `vite.shared.ts`) makes `styles['button-icon']` a TS error.

### 3. Class naming: role-based, short, no component-name prefix

- `root` for the outermost element; role-based names for children: `icon`, `label`, `header`, `badge`, `action`, `meta`, `item`.
- Do not repeat the component name: `button-icon` ❌, `icon` ✓.
- Repeated structural roles use the role: `item`, not `listItem`.
- No bare modifier or BEM-suffix classes (`primary`, `--small` ❌). Variant/size values use `.variant-x` / `.size-x` via a typed lookup (rule 4); booleans use `data-*`; aria stays on `aria-*`.
- When `header` is ambiguous between two blocks in the same file, **split the module** — don't prefix.

### 4. Closed enums → typed class lookups · booleans → `data-*` · aria → `aria-*`

- **Closed enums** (`variant`, `size`, …) → class lookup map with `satisfies Record<Enum, string>`; CSS targets `.variant-x` / `.size-x`. Canonical live map: `src/shared/ui/button/button.tsx`.
- **Boolean state** (`loading`, `open`, `invalid`) → `data-*` presence with `value || undefined`; CSS targets `[data-loading]` (presence, not `="true"`). Base UI sets `data-disabled` / `data-pending` itself — read those, don't mirror. **SSR stability:** islands must render the same boolean on server and client; gate client-only state behind mount or `useSyncExternalStore`.
- **Accessibility state** (`aria-pressed`, `aria-expanded`) → style `aria-*` directly.

Never compute class strings (``styles[`size-${size}`]`` is `undefined` under `camelCaseOnly`) and never put conditionals in `cx()` (`isLoading && styles.loading` is a modifier class in disguise). See Pattern A.

### 5. `cx` from `#styles`, never `classix` directly

oxlint-enforced outside `src/shared/styles/`. Same for Base UI: import wrappers from `@/shared/ui/*`, never `@base-ui/react` directly.

### 6. No descendant element selectors

Every styled element gets its own class. `.copy h1`, `.tags li` ❌. Sole exception: `src/shared/ui/markdown/prose.module.css`, which styles injected pre-rendered Markdown HTML that can't carry classes.

### 7. Components consume semantic tokens only

- Semantic tier: `vars/colors.css`, `fonts.css`, `shape.css`, `shadows.css`, `size.css` (full inventory in the reference section below).
- Palette ramps (`--color-gray-*`, `--color-blue-*`, `--color-orange-*`, `--color-yellow-*`, `--color-olive-*`, `--color-seagrass-*`) and raw color literals in component modules are forbidden. Sole sanctioned exception: the home hero gradients (`src/_pages/home/ui/quizbun.module.css`) tint palette ramps directly — new exceptions need review sign-off.
- One-off tinting → `color-mix()` against a semantic token (Pattern C). Promote to a new token at 2+ uses or when themes should differ.
- T-shirt scale: `xxs / xs / s / m / l / xl / xxl`. Never `sm` / `md` / `lg`.

### 8. Theming: `light-dark()` in tokens, never `[data-theme]` in components

New semantic color tokens use `light-dark(<light>, <dark>)`. Component modules must not contain `[data-theme]` selectors or override `color-scheme`.

### 9. Cascade layers

Order (declared in `src/shared/styles/index.css`): `@layer reset, base, layout, typography, utils, ui;`

- `reset` → `shared/styles/reset.css`; `base` → `shared/styles/global.css` (`html`, `body`, root typography).
- `layout` / `typography` / `utils` → `shared/styles/*.module.css` — each declares its own layer.
- `src/shared/ui/**/*.module.css` → wrap rules in `@layer ui`.
- `_pages/**`, `features/**`, `entities/**` modules and Astro `<style>` blocks → **unlayered** (always win).
- `vars/*.css` → deliberately unlayered: plain global `:root` custom properties, not rules.

Unlayered styles override every layer — shared primitives are the **floor**, feature modules the ceiling.

### 10. `composes` reduces markup churn, not collects utilities

Default: explicit composition in markup — `cx(layout.section, typography.h2)` keeps decisions visible at the call site. Use `composes: … from "#styles/utils.module.css"` only when the same combination repeats enough that factoring it once in CSS beats re-typing it.

### 11. Private custom properties use `--_` prefix

`--foo` is public (token or documented component input); `--_foo` is private plumbing — don't read or override from outside. Stylelint enforces the name shape.

### 12. Never author `*.module.css.d.ts` files

The dev server regenerates them automatically (`vite-css-modules` with `generateSourceTypes`). Run `bun run css:dts` after batch changes or when the dev server isn't running. Hand-rolled files get overwritten.

### 13. Use logical properties

`padding-inline`, `margin-block`, `inset-inline-*` instead of `padding-left`, `left`, etc. Physical properties only for genuinely physical geometry; `width` / `height` stay physical.

## Patterns (good vs. bad)

### Pattern A — typed lookups for enums, `data-*` for booleans

```tsx
// ✓
const VARIANT_CLASS = {
  primary: styles.variantPrimary,
  secondary: styles.variantSecondary,
} satisfies Record<Variant, string>;

<button
  className={cx(styles.root, VARIANT_CLASS[variant], className)}
  data-loading={loading || undefined}
  aria-pressed={isPressed}
/>;
```

```tsx
// ✗ three anti-patterns
<button
  className={cx(
    styles.root,
    isLoading && styles.loading, // conditional in cx() — use data-loading
    styles[`size-${size}`], // undefined under camelCaseOnly
  )}
  data-variant={variant} // closed enum on data-* loses .d.ts type safety
/>
```

### Pattern B — runtime values via `cssVars`

```tsx
<Bar style={cssVars({ "--_progress": `${pct}%` })} />
```

```css
.bar {
  width: var(--_progress);
}
```

`cssVars(...)` rejects non-`--*` keys at the type level. `style={{ width: … }}` bypasses every cascade layer.

### Pattern C — theme-aware tinting

```css
/* ✓ */
background: color-mix(in oklch, var(--color-panel-bg) 92%, transparent);
/* ✗ */
background: color-mix(in oklch, var(--color-gray-100) 92%, transparent);
/* ✗ */
[data-theme="dark"] .banner {
  background: black;
}
```

## Reference

### Token files

```
src/shared/styles/vars/
  palette.css   primitive  closed oklch ramps: gray, blue, orange, yellow, olive, seagrass
  colors.css    semantic   theme-aware via light-dark()
  fonts.css     semantic   families, sizes (--fs-*), weights (--fw-*), line heights (--lh-*)
  shape.css     semantic   radii (--rounded-*)
  shadows.css   semantic   elevation
  size.css      semantic   layout dimensions (--max-content-width, --header-height, --body-inline-padding, …)
```

### Theming mechanics

Single source of truth on `<html>`: `data-theme="light|dark"` (resolved theme) plus `data-theme-preference="light|dark|system"` (user choice, persisted in localStorage as `quizbun-theme`). Set by `src/app/ui/theme-switcher.astro` with logic in `src/app/lib/theme-preference.ts`. `src/shared/styles/global.css` maps the attribute to `color-scheme`; semantic tokens carry both theme values inline:

```css
--color-text-primary: light-dark(var(--color-gray-900), var(--color-gray-100));
```

### CSS Modules wiring

`vite.shared.ts` sets `localsConvention: "camelCaseOnly"` and the `#styles` alias; `astro.config.mjs` wires `vite-css-modules` with `generateSourceTypes`, so `*.module.css.d.ts` typings regenerate automatically while `bun run dev` runs.

### Shared style modules

Live in `src/shared/styles/`, re-exported through the `#styles` alias (`src/shared/styles/index.ts`) — the canonical import path in every layer, including `shared/ui/*`:

```ts
import { cx, cssVars, layout, typography, utils } from "#styles";
```

| Module                  | Holds                                                                                           |
| ----------------------- | ----------------------------------------------------------------------------------------------- |
| `layout.module.css`     | Structural grammar: `page`, `container`, `section`, `quiz-card-grid`                            |
| `typography.module.css` | Heading + body scale: `h1`…`h4`, `body`, `body-strong`, `caption`, `mono`, `h-link`             |
| `utils.module.css`      | Escape hatches: `visually-hidden`, truncation, `rounded-*` (incl. squircle), `cell-background*` |

**Does NOT earn a slot:** anything theme-aware (token in `vars/colors.css`), anything component-y (`shared/ui/*`), anything with only one consumer today (wait for the second). Class names here are a public API — descriptive kebab-case that survives grep.

### Container queries

`container-name` values are global — keep them repo-unique (today only `footer` in `src/app/ui/footer.astro`). Namespace as `<area>-<role>` (`ui-card`) whenever a bare role name could collide.

### Custom-property privacy in practice

The `--_` underscore is social — CSS has no privacy — but `grep "var(--_"` reveals a component's internal state surface. Stylelint enforces the name shape (kebab-case, optional leading `_`).

### Lint enforcement scope

**Principle:** lint only the objective rules; architectural judgment stays with reviewers — the moment a rule needs "well, in this case…" it belongs in code review.

**Lintable** (actually enforced today):

- `stylelint.config.mjs`: `stylelint-config-standard` + `stylelint-config-clean-order/error` (strict property ordering, autofixed by `bun run check`); `.astro` `<style>` blocks linted via `postcss-html`; custom-property names kebab-case with optional `_` prefix; `composes` and `:global` allowed.
- `.oxlintrc.json`: no direct `classix` import outside `src/shared/styles/` (use `cx` from `#styles`); no direct `@base-ui/react` import outside `src/shared/ui/`.

**Review-only** (deliberately not linted):

- Semantic-tokens-only: palette tokens or raw colors in component modules.
- `[data-theme]` selectors or descendant element selectors in component modules.
- Inline `style` outside `cssVars(...)` — stylelint can't see TSX.
- `!important` — avoid; escape only with a reason comment.
- Naming choices, `composes` vs. markup composition, when to extract a token, when a module should split.
