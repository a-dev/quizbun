---
name: css-modules-setup
description: Audit, bootstrap, align, migrate, or verify the typed CSS Modules methodology in a project.
disable-model-invocation: true
---

# Typed CSS Modules — setup and alignment

This is the manual setup skill. It installs or verifies the plumbing consumed by the model-invoked `css-modules` skill.

The Vite + React adapter is the tested reference. The shared API, layer topology, visual values, and CSS-specific verification commands belong to the project.

## Choose one explicit mode

Every run starts with `audit`, then proceeds only into the mode the user requested.

| Mode        | Purpose                                            | Mutation contract                      |
| ----------- | -------------------------------------------------- | -------------------------------------- |
| `audit`     | discover the project and report alignment          | never writes                           |
| `bootstrap` | create a selected baseline in an undecided project | writes after a plan is accepted        |
| `align`     | fill safe gaps around compatible choices           | preserves compatible alternatives      |
| `migrate`   | replace an incompatible convention                 | requires an explicit migration request |
| `verify`    | run behavioral checks and disposable fixtures      | does not change source or config       |

A generic “set this up” request authorizes `bootstrap` or `align`, not `migrate`. Inspection, audit, and verification requests never authorize mutation.

Use the bundled setup planner for a deterministic plan:

```sh
node <css-modules-setup-skill>/scripts/setup.mjs <mode> \
  --root <project-root> \
  --format human
```

The planner is read-only by default. `bootstrap`, `align`, and `migrate` accept `--apply` only after the printed plan is reviewed. `migrate` additionally requires `--authorize-migrate`; `audit` and `verify` reject `--apply`.

## Step 1 — establish a read-only baseline

Read `references/discovery.md`. The bundled audit discovers the package manager, application roots, aliases, helpers, shared modules, layers, color files, CSS-specific commands, CI ordering, and version drift; additionally record repository instructions, pre-existing command failures, and dirty files.

Run the bundled audit when available:

```sh
node <css-modules-setup-skill>/scripts/audit.mjs \
  --root <project-root> \
  --format human \
  --check
```

The audit parses files but never imports executable Vite or application configuration. A check that cannot be proven statically reports `not-verifiable` with a follow-up command.

**Complete when:** one application target is selected, every finding has a status, and the target worktree is unchanged.

## Step 2 — resolve only consequential ambiguity

Preserve a coherent existing project contract.

Ask only when the repository cannot answer safely, including:

- multiple plausible application roots;
- conflicting layer-order declarations;
- competing shared-style entry points;
- incompatible aliases or helpers;
- missing color values when the user selected the color-token contract;
- a requested migration with more than one valid destination.

For an undecided greenfield project, propose these reference choices together:

- styles root: `src/shared/styles`;
- alias: `#styles` with bare and subpath resolution;
- helpers: `cx` and `cssVars`;
- shared modules: `layout`, `typography`, and `utils`;
- layer topology: `reset, base, atoms, ui`;
- local component modules: unlayered;
- composition: markup.

Every item is editable. Module categories and cascade layers are separate decisions; several modules may belong to one layer.

Do not ask for or create a spacing, sizing, typography, or shape scale. Preserve such systems when the project already defines them.

**Complete when:** all decisions required for the requested mode are either discovered or explicitly selected.

## Step 3 — print the mutation plan

Before writing, print:

- target application and package manager;
- mode;
- files to create and modify;
- dependencies and CSS-harness package scripts to add;
- configuration merges;
- preserved compatible alternatives;
- CSS-harness commands that will run;
- explicit non-goals.

In `audit` and `verify`, print the plan as a report and do not offer automatic edits.

**Complete when:** the user can see the entire write set before mutation begins.

## Step 4 — apply technical plumbing safely

For Vite + React, read `adapters/vite-react.md`. For profile and template semantics, read `references/project-contract.md`.

If audit reports a version mismatch, read `references/migrations.md`. Do not update versions or configuration outside explicit `migrate` mode.

Rules:

- use the detected package manager and workspace syntax;
- never create a second lockfile;
- structurally merge Vite, TypeScript, package, and CI configuration;
- preserve plugins, aliases, CSS options, lifecycle scripts, and user choices;
- never replace an existing `prepare` command;
- do not overwrite a present file in `bootstrap` or `align`;
- stop on incompatible drift unless `migrate` was explicitly selected;
- report each touched file immediately if a later phase fails.

When the selected profile enables `enforcement`, read `references/mechanical-enforcement.md`. Bundle the checker files shown by the setup plan, install only the printed CSS-harness dependencies, and preserve the project's existing ESLint, Oxlint, and Stylelint configuration.

Use the files under `assets/templates/` as parameterized source material through `scripts/setup.mjs`. In `bootstrap`, pass the developer-reviewed values with `--inputs <json-path>`. An unresolved required input returns `needs-input`; it never becomes an empty class or invented visual value.

The palette and semantic color templates apply only when the developer selects the article's color contract. Visual values require project input.

**Complete when:** every planned change is applied, every unplanned conflict stops the run, and no unrelated file changes.

## Step 5 — write the project contract

Use the setup planner to copy `assets/css-modules.schema.json` to `.agents/css-modules.schema.json` and create `.agents/css-modules.json` from the selected and discovered values. Pass a reviewed greenfield profile with `--profile-source <json-path>`.

The profile records decisions the daily skill cannot safely rediscover. Executable configuration remains authoritative.

Do not add fields for generic spacing or sizing scales. A project-specific extension may document them outside the generic schema.

Validate the profile with:

```sh
node <css-modules-setup-skill>/scripts/audit.mjs \
  --root <project-root> \
  --format json
```

**Complete when:** the profile validates, describes the selected app, and agrees with executable configuration.

## Step 6 — verify without touching production UI

Run:

1. `commands["css:generate"]`, only after setup explicitly selected mutation;
2. `commands["css:types"]`, which proves generated class-key access through TypeScript;
3. `commands["css:check"]`, when the project records a CSS-specific static check;
4. `commands["css:verify"]`, or the bundled disposable reference fixture, when recorded;
5. the read-only audit and setup dry-run again.

Record `css:check` as the bundled `check.mjs --run-declarations` invocation from `references/mechanical-enforcement.md`, so declarations, CSS typing, ESLint, Stylelint, and cross-file contracts have one ordered entry point. Existing projects may record `enforcement.severity` as `warning` before promoting it to `error`.

Read `references/reference-fixture.md` when the selected project has no existing CSS-specific runtime fixture or when validating changes to this harness itself.

Do not add or run generic application `lint`, `test`, `build`, or `dev` commands merely because setup is verifying CSS. If CSS behavior cannot be isolated, report it as `not-verifiable` and name the project command a developer may choose to run.

Do not restyle an existing production component as a smoke test.

Verification should prove:

- bare and subpath aliases resolve;
- external `composes` builds when selected;
- generated declarations reject invalid class keys;
- the selected layer precedence works in a browser when runnable;
- semantic colors switch with `color-scheme` when enabled;
- native, ARIA, and private state render as expected.

**Complete when:** commands pass or introduced failures are isolated, runtime claims have evidence, and a second setup run proposes no changes.

## Step 7 — report and recover

Report:

- selected mode and application;
- created and modified files;
- preserved alternatives;
- CSS-harness commands and results;
- runtime cases verified;
- `not-verifiable` cases;
- pre-existing versus introduced failures;
- scoped rollback instructions for touched files.

On partial failure, do not erase successful user-owned changes. Name the last completed phase and every touched file.

**Complete when:** the user can reproduce verification and reverse only this setup's changes if needed.

## Compatibility taxonomy

| Status                   | Meaning                                                    |
| ------------------------ | ---------------------------------------------------------- |
| `aligned`                | matches the portable contract and recorded project choices |
| `missing`                | a required selected capability is absent                   |
| `drifted`                | executable configuration conflicts with the profile        |
| `ambiguous`              | multiple valid owners or targets exist                     |
| `not-verifiable`         | static inspection cannot prove behavior safely             |
| `compatible-alternative` | different implementation with verified equivalent behavior |

## Completion criterion

Setup is complete only when the project contract is explicit, configuration and profile agree, verification has run, no production component was used as scaffolding, a second dry-run has zero changes, and no migration occurred without authorization.
