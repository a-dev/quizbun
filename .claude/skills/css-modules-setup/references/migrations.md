# Profile and adapter migrations

Load this reference when audit reports a methodology, profile-schema, or adapter-version mismatch.

## Version ownership

- `skillPackageVersion` identifies this repository's distributable skill bundle.
- `methodologyVersion` identifies the portable styling contract.
- `profileSchemaVersion` identifies the JSON profile shape.
- `adapter.name` and `adapter.version` identify the tested stack integration.
- The installed skill revision is separate; updating a skill does not authorize changing a project profile.

The executable values and adapter minimums live in `../versions.json`. Audit consumes the same manifest.

## Released contracts

### Methodology 1.0.0 / schema 1 / Vite + React adapter 1.0.0

This is the first versioned contract. Moving from an unversioned or `0.x` profile may add:

- explicit methodology, profile-schema, and adapter versions;
- project-selected shared API, layer ownership, composition, and color-contract fields;
- CSS-only commands and optional runtime verification cases;
- optional enforcement severity, private boolean attributes, public shared classes, and narrow rule exceptions.

The expected diff is limited to the profile, bundled harness files, selected CSS package scripts/dependencies, and configuration required by the chosen adapter. Aliases, layers, shared boundaries, admission rules, and accepted exceptions survive when they remain compatible.

## Migration boundary

Audit only reports version drift. It does not rewrite the profile, configuration, or source.

Before `migrate` mode writes:

1. compare the installed schema and adapter with the project versions;
2. list behavior changes, profile changes, and expected file diffs;
3. preserve project-selected aliases, boundaries, layers, admission rules, and exceptions where compatible;
4. ask for any decision the new contract cannot derive;
5. receive an explicit migration request.

Run `scripts/verify-installation.mjs` before migration when discovery is ambiguous. Update or remove stale project/global copies before relying on the new contract.

After migration, run profile validation, project verification, the read-only audit, and a second dry-run. Report any accepted deviation that remains.

**Complete when:** the project has an explicit migration plan, no compatible project choice was replaced silently, and a second run proposes no changes.
