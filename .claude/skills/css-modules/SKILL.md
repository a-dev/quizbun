---
name: css-modules
description: Use when styling React components in a project that adopted this typed CSS Modules methodology, identified by a valid .agents/css-modules.json profile, explicit repository instructions, or a direct user request. Trigger for CSS Modules, className/style props, variants, component state, semantic colors, or themes. Do not apply to Tailwind, CSS-in-JS, MUI sx, or unrelated CSS Modules projects. Project-local conventions win.
---

# Typed CSS Modules — per-edit discipline

Apply this skill only after the adoption gate passes. The project contract wins over every reference default in this skill.

## Adoption gate

Activate when at least one condition is true:

1. `.agents/css-modules.json` exists and is valid.
2. Repository instructions explicitly adopt this methodology.
3. The user directly asks to apply or migrate to it.

An arbitrary `*.module.css`, `className`, or React component is not adoption.

If the user asks only to inspect or verify an unprofiled project, do not mutate it or suggest migration as an automatic next step. Use the setup skill's `audit` mode.

## Load the project contract

Before editing, read:

1. `.agents/css-modules.json`, when present;
2. repository instructions;
3. the nearest comparable component and shared-style entry point;
4. project commands relevant to the change.

The profile records choices; executable configuration remains authoritative. If they conflict, report drift instead of guessing.

Reference examples use `#styles`, `cx`, `cssVars`, `layout`, `typography`, `utils`, and `reset, base, atoms, ui`. Substitute the profile's actual names and topology.

## Project choices

The source rules below are portable. The project chooses:

- alias, helpers, styles root, entry point, and shared module boundaries;
- layer names, order, ownership, and local-module strategy;
- markup composition, `composes`, or a documented mix;
- shared-admission policy;
- spacing, sizing, typography, and shape conventions;
- CSS-specific verification commands and runtime cases.

Never invent, normalize, or enforce a spacing or sizing scale unless project documentation or the user explicitly requires one.

## Per-edit loop

### 1. Discover

Read the profile and inspect the nearest comparable implementation. Identify the selected shared API, layer owner, state channels, color contract, and verification entry.

**Complete when:** every style you may touch has a known owner or an explicit ambiguity to report.

### 2. Classify

Route each concern before writing CSS:

| Concern                  | Route                            |
| ------------------------ | -------------------------------- |
| Closed design variant    | exhaustive typed class lookup    |
| Native state             | native attribute or pseudo-class |
| Accessibility state      | ARIA value selector              |
| Private boolean state    | presence-based `data-*`          |
| Headless-library state   | library-owned attribute          |
| Continuous runtime value | private custom property          |
| Reusable class           | project shared-admission policy  |
| Local composition        | local CSS Module                 |

For detailed interaction and loading contracts, read `references/state-and-accessibility.md` when a component has state, ARIA, loading, selection, disclosure, or headless-library behavior.

**Complete when:** every variant, state, runtime value, and reusable candidate has one route.

### 3. Implement

Make the smallest change consistent with the project contract and the rules below.

**Complete when:** the source change contains no unclassified style or state channel and introduces no silent project-wide decision.

### 4. Static verification

Run the profile's applicable `css:generate`, `css:types`, `css:check`, and `css:verify` commands. The last two are optional and exist only when the project has CSS-specific checks.

When `enforcement` is enabled, treat checker rule IDs as objective findings. Apply only documented `(rule, scope, match)` exceptions. Shared-admission decisions, semantic coupling, visual quality, and project-owned spacing or sizing policy remain agent/human review rather than lint rules.

Do not run generic application `lint`, `test`, `build`, or `dev` commands merely because this is a styling edit. If the CSS contract cannot be verified by a recorded command, report that part as unverified.

**Complete when:** configured CSS declaration, type, and contract checks pass, and pre-existing failures are separated from failures introduced by the edit.

### 5. Runtime verification

Observe runtime behavior through the project's existing browser, Storybook, preview, or component-test entry. Static checks alone never prove visual verification. Select applicable cases from the profile's recorded `runtimeVerification` dimensions: theme, viewport, interaction, state, preference, and direction.

Inspect the DOM contract with the visible output:

- state attributes are present or absent correctly and accessible state stays meaningful;
- the computed cascade comes from the expected layer or local rule;
- caller `className` remains present and custom properties hold expected runtime values;
- focus and keyboard behavior match the product contract.

Distinguish three kinds of evidence in the report:

- **DOM state:** attributes, classes, and custom properties;
- **accessibility behavior:** focus, keyboard activation, accessible name, and announcements;
- **visual output:** computed cascade, themes, viewports, and user preferences.

Use only existing project runtime infrastructure during an ordinary edit. Do not install Storybook, Playwright, visual-regression tooling, or another runner unless the user requested that infrastructure change.

**Complete when:** applicable runtime behavior is observed through an existing entry, and every unavailable dimension is named rather than inferred.

### 6. Report

Report changed behavior, commands run, runtime cases observed, unverified cases, and pre-existing failures separately.

**Complete when:** the user can distinguish proven behavior from assumptions.

## Source rules

### One co-located module per component boundary

Use one `*.module.css` for one component boundary. Split unrelated blocks when names become ambiguous; do not solve ambiguity with component-name prefixes.

### Kebab-case CSS, camelCase TypeScript

With `camelCaseOnly`, `.button-icon` is consumed as `styles.buttonIcon`. Never compute CSS Module keys.

```tsx
type Variant = "primary" | "secondary";

const VARIANT_CLASS = {
  primary: styles.variantPrimary,
  secondary: styles.variantSecondary,
} satisfies Record<Variant, string>;
```

Generated declarations provide the available keys. `tsc` supplies the actual check.

### Short role names

Use `root` for the outer element and short owned roles such as `icon`, `label`, `header`, `item`, `meta`, and `action`.

Avoid BEM and repeated component names. Use `variant-*` and `size-*` only for closed component APIs; their values do not define a project-wide sizing scale.

### State keeps its semantic source

- Private booleans remove false attributes and use presence selectors.
- Meaningful ARIA false values stay present and use value selectors.
- Native and headless-library state is styled directly, not mirrored.
- Boolean state does not disappear into conditional `cx` entries.

### Inline styles are integration boundaries

Application-owned runtime values use the configured custom-property helper:

```tsx
<Progress style={cssVars({ "--_progress": `${progress}%` })} />
```

Library-owned geometry may remain inline when an integration such as Floating UI requires it. Isolate and document the exception.

### Every authored styled element owns a class

Avoid bare descendant element selectors such as `.card h2`. Relationship selectors between owned classes are allowed when state or structure crosses elements.

Read `references/edge-cases.md` for pseudo-elements, parent-state selectors, injected HTML, fragments, `asChild`, inline integrations, system colors, and composition ownership.

### Semantic color contract is opt-in and profile-driven

When `colorTokens.enabled` is true:

- component modules consume semantic roles only;
- palette tokens feed semantic tokens but do not appear in components;
- raw authored colors stay out of component modules;
- theme switching happens through the global `color-scheme` mapping;
- component modules do not own `[data-theme]` selectors.

`currentColor`, system colors for forced-colors, and `transparent` remain valid where semantically appropriate.

Do not infer typography, spacing, shape, or sizing token systems from the color contract.

### Layers come from the profile

Do not hardcode layer names. Use `layers.order`, `layers.ownership`, and `layers.localModules` from the project profile.

For normal declarations, verify the configured precedence. Remember that important declarations reverse layer order.

### The shared API is project-owned

An atom is a reusable class published through the recorded shared style API. It may contain one declaration or several related declarations.

Before adding a public class:

1. consult `sharedApi.admissionRule`;
2. confirm its module and layer owner;
3. update the entry point when the profile requires an export;
4. avoid extracting merely because declarations happen to match.

“Second semantic consumer” is default guidance only when the project has not selected another admission rule.

### Composition follows the project

Use the profile's `composition` value:

- `markup`: combine shared and local classes with the configured class helper;
- `composes`: compose stable local roles in CSS;
- `mixed-with-rule`: follow the rule documented by the profile or repository.

External `composes` paths must use the configured alias and pass the recorded style verification. If no CSS-specific fixture proves them, report composition as unverified.

### Private custom properties use `--_`

Use `--_name` for component-internal runtime plumbing. Public custom properties require a documented component or design-system contract.

## Completion criterion

The task is complete only when every changed style has an owner, every state has one semantic source, profile-driven checks have run, relevant runtime behavior has been observed when possible, and unverified cases are explicit.
