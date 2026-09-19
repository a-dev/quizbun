# Read-only project discovery

Load this reference at the beginning of every setup run.

## Safety boundary

- Read static files only.
- Do not import or execute Vite, package, application, or CI configuration during audit.
- Do not install packages, generate declarations, or rewrite configuration.
- Report behavior that static inspection cannot prove as `not-verifiable`.
- Run write-capable verification only in explicit `verify`, `bootstrap`, `align`, or `migrate` modes.

## Run the audit, then look where it cannot

`scripts/audit.mjs` detects the package manager (from `packageManager` and lockfiles; more than one lockfile family is ambiguity — never create a second lockfile), the profile and its versions, aliases, shared entry points and exports, layer declarations and ownership, color files and `color-scheme` mapping, recorded commands, and their CI ordering.

Inspect by hand what the audit cannot see:

- repository instructions and local skill files;
- helper implementations;
- external `composes` paths;
- package boundaries under workspace manifests;
- pre-existing command failures and dirty files.

## Application roots

Find workspace declarations and candidate Vite configs:

- `vite.config.ts`, `.mts`, `.js`, `.mjs`, `.cjs`, or `.cts`;
- package scripts that invoke Vite;
- source entries that import a global stylesheet.

If multiple candidates are plausible and no profile selects one, ask the user.

## Classify findings

Assign each finding one status from the compatibility taxonomy in `SKILL.md`.

Presence is weaker than capability. Finding `#styles` text does not prove TypeScript imports, CSS subpaths, and external `composes` all resolve.
