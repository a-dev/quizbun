import { expect, test, type Page } from "@playwright/test";

import { pasteQuizJson, quizLinkPath } from "./fixtures/quiz-link";
import {
  changedContentHashQuiz,
  contentHashQuiz,
  makeQuiz,
  singleChoiceQuiz,
} from "./fixtures/quizzes";
import { questionGroup } from "./fixtures/player";
import { seedQuiz } from "./fixtures/seed";

async function importQuiz(page: Page, quiz = singleChoiceQuiz) {
  await page.goto("/import/");
  await page.getByLabel("Paste quiz JSON").fill(JSON.stringify(quiz, null, 2));
  await page.getByRole("button", { name: "Validate" }).click();
}

test("Import validates JSON through the UI and saves the Quiz to the Library", async ({ page }) => {
  await importQuiz(page);

  await expect(page.getByRole("article", { name: singleChoiceQuiz.title })).toBeVisible();

  await page.getByRole("button", { name: "Save to Library" }).click();

  await expect(page).toHaveURL(/\/library\/quiz\/\?id=e2e-single-choice$/);
  await expect(page.getByRole("heading", { name: singleChoiceQuiz.title })).toBeVisible();

  await page.getByRole("link", { name: "Back to the Library" }).click();

  await expect(page.getByRole("heading", { name: "Library" })).toBeVisible();
  await expect(page.getByRole("link", { name: singleChoiceQuiz.title })).toBeVisible();
});

test("Import reports path-precise Standard errors", async ({ page }) => {
  const invalidQuiz = JSON.stringify({ ...singleChoiceQuiz, schemaVersion: "1.0" }, null, 2);

  await page.goto("/import/");
  await page.getByLabel("Paste quiz JSON").fill(invalidQuiz);
  await page.getByRole("button", { name: "Validate" }).click();

  const report = page.getByRole("alert");

  await expect(report).toContainText("Quiz JSON is invalid");
  await expect(report).toContainText("Path: `schemaVersion`");
  await expect(report).toContainText('Use `"schemaVersion": 1`');
});

test("Import handles id collisions and keeps progress when the Content hash is unchanged", async ({
  page,
}) => {
  await importQuiz(page);
  await page.getByRole("button", { name: "Save to Library" }).click();

  await page.getByRole("button", { name: "Start" }).click();
  await page.getByRole("radio", { name: "0" }).check();
  await page.getByRole("button", { name: "Submit" }).click();
  await page.getByRole("button", { name: "Finish" }).click();
  await expect(page.getByRole("status").filter({ hasText: "1 of 1 correct" })).toBeVisible();

  await importQuiz(page);
  await page.getByRole("button", { name: "Save to Library" }).click();

  const dialog = page.getByRole("dialog", { name: "A quiz with this id already exists" });

  await expect(dialog).toBeVisible();
  await dialog.getByRole("button", { name: "Cancel" }).click();
  await expect(dialog).toBeHidden();
  await expect(page).toHaveURL(/\/import\/$/);

  await page.getByRole("button", { name: "Save to Library" }).click();
  await expect(dialog).toBeVisible();
  await dialog.getByRole("button", { name: "Replace" }).click();

  await expect(page).toHaveURL(/\/library\/quiz\/\?id=e2e-single-choice$/);
  await expect(page.getByRole("button", { name: "See summary" })).toBeVisible();
});

test("Import invalidates only changed Questions when Content hashes differ", async ({ page }) => {
  await page.goto("/library/");
  await expect(page.getByRole("region", { name: "Your quizzes" })).toBeVisible();
  await seedQuiz(page, contentHashQuiz);
  await page.goto(`/library/quiz/?id=${contentHashQuiz.id}`);

  await page.getByRole("button", { name: "Start" }).click();

  const stableQuestion = questionGroup(page, 1);
  await stableQuestion.getByRole("radio", { name: "A" }).check();
  await stableQuestion.getByRole("button", { name: "Submit" }).click();

  const editedQuestion = questionGroup(page, 2);
  await editedQuestion.getByRole("radio", { name: "B" }).check();
  await editedQuestion.getByRole("button", { name: "Submit" }).click();
  await page.getByRole("button", { name: "Finish" }).click();
  await expect(page.getByRole("status").filter({ hasText: "2 of 2 correct" })).toBeVisible();

  await importQuiz(page, changedContentHashQuiz);
  await page.getByRole("button", { name: "Save to Library" }).click();

  const dialog = page.getByRole("dialog", { name: "A quiz with this id already exists" });
  await expect(dialog).toBeVisible();
  await dialog.getByRole("button", { name: "Replace" }).click();

  await expect(page).toHaveURL(/\/library\/quiz\/\?id=e2e-content-hash$/);
  await expect(page.getByText("1 of 2 answered")).toBeVisible();
  await expect(page.getByRole("button", { name: "Continue" })).toBeVisible();

  await page.getByRole("button", { name: "Continue" }).click();

  await expect(stableQuestion.getByRole("radio").first()).toBeDisabled();
  await expect(stableQuestion.getByRole("status")).toContainText("Correct!");
  // The re-import changed Question 2's title; its content reflects the new text
  // and the Question is unlocked again (its answer controls re-enabled).
  await expect(editedQuestion).toContainText("Which letter follows A");
  await expect(editedQuestion.getByRole("radio").first()).toBeEnabled();
  await expect(editedQuestion.getByRole("button", { name: "Submit" })).toBeDisabled();
});

test("A Quiz link opens in Import, saves, and plays", async ({ page }) => {
  await page.goto(await quizLinkPath(singleChoiceQuiz));

  await expect(page.getByRole("article", { name: singleChoiceQuiz.title })).toBeVisible();
  // The fragment is cleared right away; nothing is saved until the explicit click.
  expect(page.url()).not.toContain("qos");

  await page.getByRole("button", { name: "Save to Library" }).click();

  await expect(page).toHaveURL(/\/library\/quiz\/\?id=e2e-single-choice$/);

  await page.getByRole("button", { name: "Start" }).click();
  await page.getByRole("radio", { name: "0" }).check();
  await page.getByRole("button", { name: "Submit" }).click();

  await expect(questionGroup(page, 1).getByRole("status")).toContainText("Correct!");
});

test("Back after saving a linked Quiz does not bring the link payload back", async ({ page }) => {
  await page.goto(await quizLinkPath(singleChoiceQuiz));
  await page.getByRole("button", { name: "Save to Library" }).click();
  await expect(page).toHaveURL(/\/library\/quiz\/\?id=e2e-single-choice$/);

  await page.goBack();

  await expect(page).toHaveURL(/\/import\/$/);
  expect(page.url()).not.toContain("qos");
});

test("A link to a 200-Question Quiz previews and saves", async ({ page }) => {
  const quiz = makeQuiz(200);

  await page.goto(await quizLinkPath(quiz));

  await expect(page.getByRole("article", { name: quiz.title })).toBeVisible();

  await page.getByRole("button", { name: "Save to Library" }).click();

  await expect(page).toHaveURL(new RegExp(`/library/quiz/\\?id=${quiz.id}$`));
});

test("A 201-Question Quiz gets the same Question-count report from a link and from a paste", async ({
  page,
}) => {
  const quiz = makeQuiz(201);
  const report = page.getByRole("alert");

  await page.goto(await quizLinkPath(quiz));
  await expect(report).toContainText("201 Questions; Quizbun imports up to 200");
  const reportFromLink = (await report.textContent()) ?? "";

  await page.goto("/import/");
  await pasteQuizJson(page, quiz);
  await page.getByRole("button", { name: "Validate" }).click();

  await expect(report).toContainText("201 Questions; Quizbun imports up to 200");
  await expect(report).toHaveText(reportFromLink);
});
