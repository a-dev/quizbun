/**
 * Mutation testing — optional, never part of CI. Run it with `bun run mutate`
 * (or `bun run mutate:file <glob>`) when you want to know whether a test suite
 * actually asserts on the behaviour it covers.
 *
 * `@stryker-mutator/vitest-runner` is patched (see `patches/`): it builds
 * Vitest's `testNamePattern` by joining suite and test names with a space,
 * while Vitest 5 matches them joined with " > ". Unpatched, every mutant runs
 * zero tests and reports as survived (stryker-js#6210).
 *
 * @type {import("@stryker-mutator/api/core").PartialStrykerOptions}
 */
export default {
  testRunner: "vitest",
  vitest: {
    // The unit lane on its own. Stryker's vitest runner takes a single config
    // file and has no `--project` switch, and the browser lane would need a
    // real Chromium per mutant.
    configFile: "vitest.stryker.config.ts",
  },

  // Stryker 10 rewrites `extends`/`references` paths in the tsconfig it copies
  // into the sandbox, using `ts.parseConfigFileTextToJson` — an API the
  // TypeScript 7 native port no longer exposes. Pointing at a file that is not
  // part of the project skips that step. Nothing is lost: our tsconfig has no
  // project references, and every path in it is already project-relative, so
  // the rewrite was a no-op even on TypeScript 6.
  tsconfigFile: "tsconfig.stryker-disabled.json",

  // Scope: the project's non-UI logic. React hooks (`use-*.ts`), `.tsx` islands
  // and Astro routes are left out — the browser and e2e lanes exercise them and
  // this runner does not execute those lanes, so mutating them would only
  // produce noise. Modules in scope that no `.spec.ts` reaches report as "no
  // coverage" rather than as survivors, which is the signal worth keeping: it
  // says where unit coverage stops.
  mutate: [
    "astro-quiz-assets.ts",
    ".storybook/lib/**/*.ts",
    "scripts/create-quiz-validator.ts",
    "scripts/generate-quiz-image-sizes.ts",
    "scripts/json-source-edit.ts",
    "scripts/quiz-validation.ts",
    "src/app/lib/**/*.ts",
    "src/features/**/lib/**/*.ts",
    "src/features/**/model/**/*.ts",
    "src/features/continue-runs/continue-runs-model.ts",
    "src/shared/lib/**/*.ts",
    "src/shared/styles/lib/**/*.ts",
    "src/shared/ui/combobox/lib/**/*.ts",
    "!**/*.spec.ts",
    "!.storybook/**/*.spec.ts",
    "!**/index.ts",
    "!**/types.ts",
    "!**/use-*.ts",
  ],

  // Beyond Stryker's defaults (node_modules, .git, build output). `.claude`
  // and `.agents` hold symlinked skill installs, which the sandbox copy cannot
  // clone; the rest is generated output no test reads.
  ignorePatterns: [
    ".agents",
    ".claude",
    "dist",
    "storybook-static",
    "tmp",
    "test-results",
    "playwright-report",
  ],

  coverageAnalysis: "perTest",
  // Static mutants (module top-level) can only be covered by reloading the
  // module per mutant; ignoring them keeps the report about the logic the unit
  // lane exercises instead of listing every module constant as a survivor.
  ignoreStatic: true,
  timeoutMS: 15_000,

  reporters: ["html", "json", "clear-text", "progress"],
  htmlReporter: { fileName: "tmp/stryker/mutation-report.html" },
  jsonReporter: { fileName: "tmp/stryker/mutation-report.json" },
  tempDirName: "tmp/stryker/sandbox",
  incremental: false,
  incrementalFile: "tmp/stryker/incremental.json",

  // Informational. `break: null` keeps a low score from failing the command —
  // this is a tool for finding weak tests, not a gate.
  thresholds: { high: 90, low: 80, break: null },
};
