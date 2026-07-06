import { expect, test } from "@playwright/test";

test("Theme switch persists across reload", async ({ page }) => {
  await page.goto("/");

  const themeSwitcher = page.getByRole("button", {
    name: "Switch theme. Current preference: System",
  });

  await themeSwitcher.click();

  await expect(page.locator("html")).toHaveAttribute("data-theme-preference", "light");
  await expect(page.locator("html")).toHaveAttribute("data-theme", "light");
  await expect(
    page.getByRole("button", { name: "Switch theme. Current preference: Light" }),
  ).toBeVisible();

  await page.reload();

  await expect(page.locator("html")).toHaveAttribute("data-theme-preference", "light");
  await expect(page.locator("html")).toHaveAttribute("data-theme", "light");
  await expect(
    page.getByRole("button", { name: "Switch theme. Current preference: Light" }),
  ).toBeVisible();
});
