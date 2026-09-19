import { defineConfig } from "@playwright/test";

export default defineConfig({
  testDir: "./browser-tests",
  fullyParallel: false,
  workers: 1,
  reporter: "line",
  use: {
    baseURL: "http://127.0.0.1:4173",
    browserName: "chromium",
  },
  webServer: {
    command: "node scripts/serve-reference.mjs",
    cwd: import.meta.dirname,
    url: "http://127.0.0.1:4173",
    reuseExistingServer: false,
  },
});
