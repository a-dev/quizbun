import { expect, test } from "@playwright/test";

// Smoke test: proves the Playwright + `astro preview` harness boots and the
// built static site serves over HTTP. Real user journeys are summarized in
// SPEC.md (§6 Testing and CI).
test("the built site serves the home page", async ({ page }) => {
  const response = await page.goto("/");
  expect(response?.ok()).toBeTruthy();
});
