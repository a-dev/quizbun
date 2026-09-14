# sonarjs sidecar

`eslint-plugin-sonarjs` loads `ts-api-utils` (via typescript-eslint) at import time, which
reads `ts.TypeFlags` from the JS TypeScript API. That API surface is gone in TypeScript 7,
which the repo root uses, so the plugin throws while loading:

    TypeError: Cannot read properties of undefined (reading 'Intrinsic')

This directory is a separate install whose own `node_modules` pins TypeScript 5, so Node
resolves TypeScript 5 for the plugin while the rest of the repo keeps TypeScript 7.
`.oxlintrc.json` points `jsPlugins` at `./tools/sonarjs/node_modules/eslint-plugin-sonarjs`.
The root `postinstall` script keeps this install in sync.

Only sonarjs's syntactic rules are enabled. Oxlint's JS plugin host provides no type
information, so the ~56 type-aware rules would silently never fire.

One of the syntactic rules, `no-os-command-from-path`, is listed as `off`: it is a security _hotspot_ rather than a defect check, and `.oxlintrc.json` records why at the rule itself.

Drop this sidecar and
move the dependency back to the root once typescript-eslint supports TypeScript 7.
