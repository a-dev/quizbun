import { expect, test, type Page } from "@playwright/test";

import { seedCatalogRun } from "./fixtures/seed";

interface WebAppManifest {
  id: string;
  scope: string;
  start_url: string;
  icons: Array<{ src: string; sizes: string; type: string; purpose: string }>;
}

test("the web app manifest is served with base-correct URLs", async ({ request }) => {
  const response = await request.get("/manifest.webmanifest");

  expect(response.status()).toBe(200);
  expect(response.headers()["content-type"]).toMatch(/^application\/manifest\+json(?:;|$)/);

  const manifest = (await response.json()) as WebAppManifest;
  const urlFields = [
    manifest.id,
    manifest.scope,
    manifest.start_url,
    ...manifest.icons.map((icon) => icon.src),
  ];

  expect(urlFields).not.toHaveLength(0);
  for (const url of urlFields) {
    expect(url).toMatch(/^\/(?!\/)/);
  }
});

for (const path of ["/", "/quizzes/", "/library/", "/docs/"]) {
  test(`the ${path} page links install metadata`, async ({ page }) => {
    await page.goto(path);

    await expect(page.locator('link[rel="manifest"]')).toHaveAttribute(
      "href",
      "/manifest.webmanifest",
    );
    await expect(page.locator('link[rel="apple-touch-icon"]')).toHaveAttribute(
      "href",
      "/icons/apple-touch-icon.png",
    );
  });
}

// Persistence is never granted to this origin in a plain Playwright context, so
// the notice would render anyway — the stub only makes that deterministic.
async function stubBestEffortStorage(page: Page) {
  await page.addInitScript(() => {
    Object.defineProperty(navigator, "storage", {
      configurable: true,
      value: { persist: async () => false, persisted: async () => false },
    });
  });
}

async function stubPersistedStorage(page: Page) {
  await page.addInitScript(() => {
    Object.defineProperty(navigator, "storage", {
      configurable: true,
      value: { persist: async () => true, persisted: async () => true },
    });
  });
}

const durabilityNotice = (page: Page) =>
  page.getByRole("status").filter({ hasText: "Browsers delete stored data" });

test("the Library durability notice stays dismissed after reload", async ({ page }) => {
  await stubBestEffortStorage(page);
  await page.goto("/library/");

  const notice = durabilityNotice(page);
  await expect(notice).toBeVisible();
  await notice.getByRole("button", { name: "Dismiss" }).click();
  await expect(notice).toBeHidden();

  await page.reload();

  await expect(page.getByRole("region", { name: "Your quizzes" })).toBeVisible();
  await expect(notice).toBeHidden();
  // Scoped to what was stored when it was taken: nothing, so the notice returns
  // once there is data (covered in the component lane).
  await expect
    .poll(() => page.evaluate(() => localStorage.getItem("quizbun.durability-notice-dismissed")))
    .toBe("nothing-stored");
});

// Protected is the quiet state: no notice, and no standing line reporting health.
test("the Library says nothing about storage once it is persisted", async ({ page }) => {
  await stubPersistedStorage(page);
  await page.goto("/library/");

  await expect(page.getByRole("region", { name: "Your quizzes" })).toBeVisible();
  await expect(durabilityNotice(page)).toBeHidden();
  await expect(page.getByText(/saved only in this browser/)).toBeHidden();
  await expect(page.getByText(/^Saved —/)).toBeHidden();
});

// A user who only takes public quizzes never opens the Library, but their
// Progress is in the same IndexedDB — Home is where the notice has to reach them.
test("Home surfaces durability once a Catalog Run exists, not before", async ({ page }) => {
  await stubBestEffortStorage(page);
  await page.goto("/");

  await expect(durabilityNotice(page)).toBeHidden();
  await expect(page.getByText(/saved only in this browser/)).toBeHidden();

  // Via /library/ so the app has opened the DB (seed.ts only puts rows), and to
  // prove the Library itself stays empty — a Run alone is enough. Waiting for the
  // rendered region is what guarantees the island hydrated and the stores exist.
  await page.goto("/library/");
  await expect(page.getByRole("region", { name: "Your quizzes" })).toBeVisible();
  await seedCatalogRun(page);
  await page.goto("/");

  await expect(durabilityNotice(page)).toBeVisible();
});

// The install path is manifest-only: no service worker is registered, so nothing
// here may assume one. Chromium's `beforeinstallprompt` is what the custom
// Install button rides on, and it cannot be exercised from Playwright — headless
// Chromium ships no install UI — so that branch is covered in the component lane
// with a synthetic event, and the real prompt is a manual check in Chrome.
test("no service worker is registered", async ({ page }) => {
  await page.goto("/");

  const registrationCount = await page.evaluate(async () => {
    if (!("serviceWorker" in navigator)) return 0;

    return (await navigator.serviceWorker.getRegistrations()).length;
  });

  expect(registrationCount).toBe(0);
});
