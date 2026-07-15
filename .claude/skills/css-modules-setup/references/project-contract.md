# Project contract and templates

Load this reference when creating or updating `.agents/css-modules.json`.

## Source of truth

The profile records decisions that agents cannot safely infer on every task. Executable configuration remains authoritative for runtime behavior.

When the two disagree, report drift. Do not rewrite either side during audit.

## Required project choices

The generic schema records:

- application and styles roots;
- global stylesheet and shared entry point;
- alias and helper names;
- shared modules and admission rule;
- layer order, ownership, and local-module strategy;
- composition policy;
- optional semantic color contract;
- CSS-specific verification commands and runtime cases;
- narrow integration exceptions.

It deliberately does not define spacing, sizing, typography, or shape scales.

The command surface is deliberately narrow:

- `css:generate` generates CSS Module declarations;
- `css:types` runs the TypeScript check that validates those declarations;
- `css:check` optionally runs CSS-specific lint or contract checks;
- `css:verify` optionally runs a CSS-specific fixture or runtime check.

Do not record generic application `lint`, `test`, `build`, or `dev` commands. A project may use a broad TypeScript command behind `css:types` when that is the only way it validates generated declarations.

## Shared boundaries

Preserve a coherent existing shared API. For an undecided project, propose `layout`, `typography`, and `utils`, but let the developer remove, rename, combine, or split them.

An atom is any reusable class published through the selected shared API. It may have one declaration or several related declarations.

Record an admission strategy:

- `project-review`: project review decides;
- `second-semantic-consumer`: require two consumers sharing one reason to change;
- `explicit`: follow a named repository document.

## Layer topology

Layer names and modules are separate. Several shared modules may belong to one layer.

The reference proposal is:

```css
@layer reset, base, atoms, ui;
```

Record:

- the complete order;
- ownership globs;
- local module strategy;
- any documented `!important` exception.

Layer ownership resolves by file path. Exactly one matching ownership glob selects its layer. More than one match is ambiguous. When no glob matches, `layers.localModules` is the fallback:

- `unlayered` requires the module's rules to remain outside `@layer`;
- `profiled` assigns `localModules.layer` to every unmatched CSS Module;
- `custom` delegates to `localModules.document`.

Scoped ownership and the fallback may intentionally select the same layer. The path rule remains unchanged: an ownership match wins, and only unmatched modules use the fallback.

## Template rules

Files under `assets/templates/` contain placeholders. Resolve every placeholder from discovered or selected values before creating a project file.

Treat any remaining `{{PLACEHOLDER}}` as a setup failure. Render placeholders from these profile decisions:

- `LAYER_ORDER`, `SHARED_LAYER`, and `UI_LAYER` come from `layers`; the color import and `color-scheme` blocks use the reviewed `colorLayer` input;
- helper and alias placeholders come from `helpers` and `alias`;
- shared exports come from `sharedApi.modules`;
- palette and semantic token bodies require developer-provided color values.

When `colorTokens.enabled` is false, render `COLOR_IMPORTS`, `COLOR_SCHEME_BLOCK`, and `REFERENCE_BUTTON_COLOR_RULES` as empty strings. Do not create the palette or colors files.

When it is true, `COLOR_SCHEME_BLOCK` must use the selected base layer, `colorTokens.themeAttribute`, and the recorded modes. `REFERENCE_BUTTON_COLOR_RULES` must consume the project's selected semantic roles, never palette values.

Do not create optional modules to make the reference map appear complete. Create only the selected modules and exports.

Color templates apply only when `colorTokens.enabled` is true. Palette values require project input; never invent a brand palette silently.

## Profile validation

Copy the schema beside the project profile so editors and offline checks can resolve it.

The audit validates required shape without executing application code. Behavioral verification remains a separate explicit action.

If the methodology, schema, or adapter version differs from the supported version, read `references/migrations.md`. Audit reports the mismatch; only explicit `migrate` mode may rewrite the profile or executable configuration.
