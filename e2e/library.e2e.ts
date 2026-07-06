import { readFile } from "node:fs/promises";

import { expect, test } from "@playwright/test";

import { singleChoiceQuiz } from "./fixtures/quizzes";
import { seedQuiz } from "./fixtures/seed";

const quizJson = JSON.stringify(singleChoiceQuiz, null, 2);

test("Library opens, exports, resets progress, deletes, and re-imports a Quiz", async ({
  page,
}) => {
  await page.goto("/library/");
  await expect(page.getByRole("region", { name: "Your quizzes" })).toBeVisible();
  await seedQuiz(page, singleChoiceQuiz);
  await page.reload();

  await page.getByRole("link", { name: singleChoiceQuiz.title }).click();
  await expect(page.getByRole("heading", { name: singleChoiceQuiz.title })).toBeVisible();

  const downloadPromise = page.waitForEvent("download");
  await page.getByTitle("Download quiz JSON").click();
  const download = await downloadPromise;
  const downloadPath = await download.path();

  expect(download.suggestedFilename()).toBe(`${singleChoiceQuiz.id}.json`);
  expect(downloadPath).not.toBeNull();

  const exportedJson = await readFile(downloadPath!, "utf8");
  expect(JSON.parse(exportedJson)).toEqual(JSON.parse(quizJson));

  await page.getByRole("button", { name: "Start" }).click();
  await page.getByRole("radio", { name: "0" }).check();
  await page.getByRole("button", { name: "Submit" }).click();
  await page.getByRole("button", { name: "Back to quiz details" }).click();

  await expect(page.getByRole("button", { name: "See summary" })).toBeVisible();
  await page.getByRole("button", { name: "Reset progress" }).click();

  const resetDialog = page.getByRole("dialog", { name: "Reset progress?" });
  await expect(resetDialog).toBeVisible();
  await resetDialog.getByRole("button", { name: "Reset progress" }).click();

  await expect(page.getByRole("button", { name: "Start" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Reset progress" })).toBeHidden();

  await page.getByRole("link", { name: "Back to the Library" }).click();
  await page.getByRole("button", { name: `Delete ${singleChoiceQuiz.title}` }).click();

  const deleteDialog = page.getByRole("dialog", { name: "Delete this quiz?" });
  await expect(deleteDialog).toBeVisible();
  await deleteDialog.getByRole("button", { name: "Delete" }).click();

  await expect(page.getByRole("link", { name: singleChoiceQuiz.title })).toBeHidden();
  await expect(page.getByRole("region", { name: "Your quizzes" })).toBeVisible();

  await page.getByRole("link", { name: "Add new quiz" }).click();
  await page.waitForLoadState("networkidle");
  await page.getByLabel("Paste quiz JSON").fill(exportedJson);
  await page.getByRole("button", { name: "Validate" }).click();
  await page.getByRole("button", { name: "Save to Library" }).click();

  await expect(page).toHaveURL(/\/library\/quiz\/\?id=e2e-single-choice$/);
  await expect(page.getByRole("heading", { name: singleChoiceQuiz.title })).toBeVisible();
});
