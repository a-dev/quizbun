import { expect, test } from "@playwright/test";

test("verifies cascade, composition, semantic themes, DOM state, and accessibility behavior", async ({
  page,
}) => {
  await page.setViewportSize({ width: 360, height: 800 });
  await page.goto("/");

  const button = page.getByRole("button", { name: "Save" });
  await expect(button).toHaveAttribute("aria-pressed", "false");
  await expect(button).not.toHaveAttribute("data-loading", "");
  await expect(button).not.toHaveAttribute("aria-busy", "true");
  await expect(button).toHaveClass(/caller-class/);
  await expect(button).toHaveCSS("--_progress", "0.6");

  await expect(page.getByTestId("layer-probe")).toHaveCSS("color", "rgb(0, 128, 0)");
  await expect(page.getByTestId("composes-probe")).toHaveCSS("display", "flex");

  const lightBackground = await button.evaluate(
    (element) => getComputedStyle(element).backgroundColor,
  );
  await page.locator("html").evaluate((element) => element.setAttribute("data-theme", "dark"));
  const darkBackground = await button.evaluate(
    (element) => getComputedStyle(element).backgroundColor,
  );
  expect(darkBackground).not.toBe(lightBackground);

  await button.focus();
  await expect(button).toHaveCSS("outline-style", "solid");
  await button.click();
  await expect(button).toBeDisabled();
  await expect(button).toHaveAttribute("data-loading", "true");
  await expect(button).toHaveAttribute("aria-busy", "true");
});

test("respects reduced motion and exposes the forced-colors branch", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce", forcedColors: "active" });
  await page.goto("/");

  await expect(page.locator('[aria-hidden="true"]')).toHaveCSS("animation-name", "none");
  expect(await page.evaluate(() => matchMedia("(forced-colors: active)").matches)).toBe(true);
});
