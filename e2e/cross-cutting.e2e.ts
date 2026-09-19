import { expect, test } from "@playwright/test";

test("Theme toggle pins a theme, persists it, and clears back to system", async ({ page }) => {
  await page.goto("/");

  const html = page.locator("html");

  // Chromium's default color scheme is light, so "system" renders light.
  await expect(html).toHaveAttribute("data-theme-preference", "system");
  await expect(html).toHaveAttribute("data-theme", "light");

  await page.getByRole("button", { name: "Switch to dark theme" }).click();

  await expect(html).toHaveAttribute("data-theme-preference", "dark");
  await expect(html).toHaveAttribute("data-theme", "dark");
  await expect(page.getByRole("button", { name: "Switch to light theme" })).toBeVisible();

  await page.reload();

  await expect(html).toHaveAttribute("data-theme-preference", "dark");
  await expect(html).toHaveAttribute("data-theme", "dark");

  // Toggling back to the system theme drops the stored override entirely.
  await page.getByRole("button", { name: "Switch to light theme" }).click();

  await expect(html).toHaveAttribute("data-theme-preference", "system");
  await expect(html).toHaveAttribute("data-theme", "light");
  await expect(
    page.evaluate(() => window.localStorage.getItem("quizbun-theme")),
  ).resolves.toBeNull();
});

test.describe("with a dark system theme", () => {
  test.use({ colorScheme: "dark" });

  test("The first toggle pins light instead of clearing the override", async ({ page }) => {
    await page.goto("/");

    const html = page.locator("html");

    await expect(html).toHaveAttribute("data-theme-preference", "system");
    await expect(html).toHaveAttribute("data-theme", "dark");

    await page.getByRole("button", { name: "Switch to light theme" }).click();

    await expect(html).toHaveAttribute("data-theme-preference", "light");
    await expect(html).toHaveAttribute("data-theme", "light");
    await expect(page.evaluate(() => window.localStorage.getItem("quizbun-theme"))).resolves.toBe(
      "light",
    );
  });
});

test("Home keeps the quiz-making thread behind a disclosure the keyboard can open", async ({
  page,
}) => {
  await page.goto("/");

  // The block's own `details`, not the "What is a skill?" one nested inside it.
  const disclosure = page.locator("main details").first();
  const summary = disclosure.locator("summary").first();
  const thread = page.getByText("water-cycle.json");

  // Closed on arrival: the hero opens on the Catalog, not on a tutorial.
  await expect(disclosure).not.toHaveAttribute("open", /.*/);
  await expect(thread).toBeHidden();

  // `press` focuses first, so this also proves the summary takes focus.
  await summary.press("Enter");

  await expect(disclosure).toHaveAttribute("open", /.*/);
  await expect(thread).toBeVisible();

  await summary.press("Enter");

  await expect(thread).toBeHidden();
});
