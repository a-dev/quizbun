# Disposable Vite + React reference fixture

Load this reference when `verify` cannot use an existing project CSS fixture, or when changing the setup templates, audit, adapter, or runtime claims in this skill.

The bundled fixture lives under `fixtures/vite-react/`. Verification copies it to a temporary directory before Vite generates declarations, so the canonical fixture and target project remain unchanged.

Run the deterministic build/type contract:

```sh
node <css-modules-setup-skill>/scripts/verify-reference.mjs
```

It must:

- generate declarations and declaration maps for every fixture CSS Module;
- pass `tsc --noEmit` against the generated class interface;
- pass a Vite production build, including alias-based external `composes`;
- prove a deliberately invalid CSS class lookup fails typechecking.

Run the browser assertions from the skills repository:

```sh
npm run css:browser
```

The spec in `browser-tests/reference.spec.mjs` covers the runtime behaviors setup step 6 must prove, plus caller classes, custom properties, focus behavior, reduced motion, and forced-colors routing.

Do not copy the fixture into a target application's production source. It is evidence for the adapter, not an application starter component.
