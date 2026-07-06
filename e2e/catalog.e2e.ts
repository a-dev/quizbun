import { expect, test, type Page } from "@playwright/test";

async function selectTag(page: Page, tag: string) {
  await page.getByTestId("combobox-trigger").click();
  await page.getByTestId("combobox-search-input").fill(tag);
  await page.getByRole("option", { name: new RegExp(`^${tag} \\(\\d+\\)$`) }).click();
}

test("Catalog lists Quizzes, filters by Tags, syncs deep links, and opens a Quiz", async ({
  page,
}) => {
  await page.goto("/quizzes/");
  await page.waitForLoadState("networkidle");

  await expect(page.getByRole("heading", { name: "Quizzes" })).toBeVisible();
  await expect(page.getByRole("link", { name: /CSS Cascade, Specificity/ })).toBeVisible();

  await page.getByRole("link", { name: "Page 2" }).click();
  await expect(page).toHaveURL(/\/quizzes\/page\/2\/$/);
  await expect(
    page.getByRole("link", { name: /Master JavaScript Promise & Async Execution/ }),
  ).toBeVisible();

  await page.goto("/quizzes/");

  await selectTag(page, "css");

  await expect(page).toHaveURL(/\/quizzes\/\?tags=css$/);
  await expect(page.getByRole("link", { name: /CSS Cascade, Specificity/ })).toBeVisible();
  await expect(page.getByRole("link", { name: /Counterintuitive Probability/ })).toBeHidden();

  await page.goto("/quizzes/?tags=css");

  await expect(page.getByRole("combobox", { name: "Filter by tags and / or" })).toContainText(
    "css",
  );
  await expect(page.getByRole("link", { name: /CSS Cascade, Specificity/ })).toBeVisible();
  await expect(page.getByRole("link", { name: /Counterintuitive Probability/ })).toBeHidden();

  await page.getByRole("link", { name: /CSS Cascade, Specificity/ }).click();

  await expect(page).toHaveURL(/\/quizzes\/css-cascade-specificity-inheritance\/$/);
  await expect(
    page.getByRole("heading", { name: "CSS Cascade, Specificity & Inheritance" }),
  ).toBeVisible();
  await expect(page.getByRole("button", { name: "Start" })).toBeVisible();
});
