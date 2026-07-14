# Mechanical enforcement

Load this reference when the project enables `enforcement` in `.agents/css-modules.json`, when adding `css:check`, or when a checker finding needs an exception.

## One aggregate command

The project command recorded as `commands["css:check"]` should invoke the bundled checker with declaration verification:

```sh
node .agents/css-modules-harness/scripts/check.mjs \
  --root . \
  --run-declarations
```

The command runs the recorded `css:generate` and `css:types` commands first, then:

1. ESLint rules for TSX state, class lookup, and inline styles;
2. Stylelint rules for selectors, colors, layers, and `!important`;
3. cross-file checks for semantic tokens, shared exports/public classes, and external `composes` paths.

It never invokes `commands["css:check"]` recursively. It does not add generic application lint, test, build, or development commands to the CSS profile.

## Oxlint adapter

For a faster TSX-only enforcement loop, run the bundled Oxlint adapter separately:

```sh
node .agents/css-modules-harness/scripts/check-oxlint.mjs \
  --root .
```

The adapter loads `harness/oxlint-plugin.mjs`, reads helper names, private boolean attributes, severity, and exceptions from the same project profile, and reports the same `css-modules/*` rule IDs as the ESLint adapter. It does not replace the aggregate `css:check` command because Stylelint and cross-file contract checks still cover different parts of the methodology.

Oxlint JavaScript plugins are currently alpha. Install the exact Oxlint version recorded in the bundled `versions.json` and update it only through an explicit harness migration.

## Migration severity

Start an existing project with:

```json
{
  "enforcement": {
    "severity": "warning",
    "privateBooleanAttributes": ["data-loading"]
  }
}
```

Warnings are reported but do not fail the command. Move to `error` only after the baseline is reviewed. Rule definitions and IDs do not change between the two levels.

## Narrow exceptions

Record an exception only when an objective rule cannot model a required integration:

```json
{
  "kind": "rule",
  "rule": "css-modules/custom-property-style-only",
  "scope": "src/integrations/floating-menu.tsx",
  "match": "floatingStyles",
  "reason": "Floating UI owns computed positioning at this integration boundary."
}
```

The checker requires the rule ID and file glob. `match` narrows the exception to one diagnostic in that file. Keep the reason specific enough for a reviewer to decide whether the exception still exists.

## Judgment remains review work

The checker intentionally does not decide:

- whether two consumers are semantically related enough to share a class;
- whether a new public abstraction belongs in the project API;
- whether spacing or sizing values should use a scale;
- whether a local visual difference is desirable;
- which project boundary or composition strategy should be adopted.

The agent applies those decisions from the project profile and reports ambiguity. A linter must not silently turn a reference default into project architecture.
