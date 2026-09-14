import { defineConfig } from "vitest/config";

import { unitProject } from "./vitest.config.ts";

// Mutation-testing lane. Stryker's vitest runner takes a single config file and
// has no `--project` switch, so this config exposes the unit lane on its own:
// the browser lane needs a real Chromium per run, which is far too slow to
// re-execute once per mutant. Mutation scope in `stryker.config.json` is kept in
// step with what this lane covers.
export default defineConfig({
  ...unitProject,
  test: {
    ...unitProject.test,
    // Stryker reports per-test coverage; a mutant killed in a worker must not be
    // attributed to another file's tests running in the same process.
    isolate: true,
  },
});
