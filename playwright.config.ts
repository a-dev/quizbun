import { defineConfig, devices } from "@playwright/test";

// `astro preview` serves the built `dist/` on this port (passed explicitly via
// `--port` in `webServer.command`). Deliberately not 4321 (the `astro dev`
// default), so an e2e run never collides with a working dev server.
const PORT = 4325;
const baseURL = `http://localhost:${PORT}`;
// Playwright clears `outputDir` before every run. A process-specific local
// directory prevents concurrent E2E commands from deleting one another's trace
// artifacts. CI uses one worker and retains its stable artifact location.
const outputDir =
  process.env.PLAYWRIGHT_OUTPUT_DIR ??
  (process.env.CI ? "./tmp/test-results" : `./tmp/test-results/${process.pid}`);

export default defineConfig({
  testDir: "./e2e",
  // The third test lane. `.spec.ts` is the unit lane and `.test.tsx` the
  // component lane (both Vitest); Playwright's default `testMatch` would grab
  // both, so e2e is pinned to its own suffix.
  testMatch: "**/*.e2e.ts",
  fullyParallel: true,
  // A stray `test.only` should fail CI, not silently skip the rest.
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  outputDir,
  reporter: process.env.CI ? [["github"], ["html", { open: "never" }]] : "list",
  use: {
    baseURL,
    trace: "on-first-retry",
  },
  // Chromium only for v1. Phone-first journeys opt in per-spec via
  // `test.use(devices["Pixel 5"])`; WebKit/Firefox are deferred until a real
  // cross-engine issue surfaces.
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
  // Run against the real static build served by `astro preview` — the faithful
  // production artifact, not the dev server. Base path stays "/" (GITHUB_PAGES
  // unset); base-path correctness is covered separately by
  // scripts/check-dist-base-paths.sh, so specs navigate with RELATIVE paths.
  webServer: {
    command: `bun run build && bun run preview --port ${PORT}`,
    url: baseURL,
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
});
