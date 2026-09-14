# Patches

Patched dependencies, applied by Bun through `patchedDependencies` in
[package.json](../package.json). Bun re-applies every patch on install, so a
fresh `bun install` reproduces the tree these patches describe.

Each patch here is a workaround for an upstream bug, not a fork: it changes as
little as possible, and it comes with a way to tell when it is no longer needed.
Anything that would outlive the upstream fix belongs in our own code instead.

## Working with a patch

```bash
bun patch <package-name>
```

That unpacks the package into `node_modules` for editing. Make the change, then:

```bash
bun patch --commit 'node_modules/<package-name>'
```

Bun rewrites the `.patch` file and the `patchedDependencies` entry. Patch files
are keyed by exact version, so a dependency upgrade drops the patch silently —
which is why each one below says how to check whether it still applies.

---

## `@stryker-mutator/vitest-runner@10.0.0`

**Upstream issue:** [stryker-js#6210](https://github.com/stryker-mutator/stryker-js/issues/6210)
— "vitest-runner: on Vitest 5 the per-test name filter matches nothing, so every
covered mutant survives (testNamePattern now joins the chain with ' > ')".
Open as of 2026-09-14.

**What is patched:** one separator, in the two copies of `collectTestName` the
package ships — `dist/src/test-helpers.js` and `dist/src/stryker-setup.js`, plus
their `src/*.ts` sources. `nameParts.join(' ')` becomes `nameParts.join(' > ')`.

**Why:** Stryker narrows each mutant run to the tests that cover it, by handing
Vitest a `testNamePattern` built from the suite chain and the test name. The
runner joins those with a space (`"quizAssetUrl builds a URL"`); Vitest 5 matches
the pattern against the chain joined with `" > "` (`"quizAssetUrl > builds a
URL"`). Nothing matches, so every mutant run executes **zero** tests and is
scored `Survived`.

The failure is quiet and misleading: the run completes, the report names the
tests it believed covered each mutant, and the score reads as a catastrophically
weak test suite rather than a broken tool. On this repository it turned a real
61% into a flat 0.00%. Both copies of the function have to change together — one
builds the filter, the other builds the test ids the coverage map is keyed by,
and they have to agree.

**Check periodically.** This is a one-line workaround for someone else's bug;
the right end state is deleting it.

- Watch [stryker-js#6210](https://github.com/stryker-mutator/stryker-js/issues/6210).
- Re-check whenever `@stryker-mutator/vitest-runner` or `vitest` is upgraded —
  a version bump orphans the patch, and Bun will say so on install.
- When a release claims the fix, drop the patch (delete the file and the
  `patchedDependencies` entry), run `bun install`, then:

  ```bash
  bun run mutate:file 'src/shared/lib/routing/quiz-asset-url.ts'
  ```

  That file's spec kills all five of its mutants, so an unpatched-and-fixed
  runner still reports 100%. A score of 0.00% with "Ran 0.00 tests per mutant on
  average" means the bug is back and the patch is still needed.

- Also drop the note in [SPEC.md §6](../SPEC.md) and the header comment in
  [stryker.config.mjs](../stryker.config.mjs) when the patch goes.
