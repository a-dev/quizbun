import { devices, expect, test, type Locator, type Page } from "@playwright/test";

import { mixedTypesQuiz, singleChoiceQuiz } from "./fixtures/quizzes";
import {
  expectLocked,
  expectUnlocked,
  pageSizeSelect,
  questionGroup,
  selectPageSize,
} from "./fixtures/player";
import { seedQuiz } from "./fixtures/seed";

async function seedAndOpenLibraryQuiz(page: Page) {
  await page.goto("/library/");
  await expect(page.getByRole("region", { name: "Your quizzes" })).toBeVisible();
  await seedQuiz(page, mixedTypesQuiz);
  await page.goto(`/library/quiz/?id=${mixedTypesQuiz.id}`);
  await expect(page.getByRole("heading", { name: mixedTypesQuiz.title })).toBeVisible();
}

async function tabUntilFocused(page: Page, target: Locator, maxTabs = 12) {
  for (let index = 0; index < maxTabs; index += 1) {
    if (await target.evaluate((element) => element === document.activeElement)) return;

    await page.keyboard.press("Tab");
  }

  await expect(target).toBeFocused();
}

test("Catalog single-choice Run locks the Question, shows the Explanation, and can be retaken", async ({
  page,
}) => {
  await page.goto("/quizzes/undo-redo-back-stacks-queues/");

  await page.getByRole("button", { name: "Start" }).click();

  await expect(page.getByRole("heading", { name: /Undo, Redo, and Back/ })).toBeVisible();
  await expect(page.getByText(/exactly what Undo needs/)).toBeHidden();

  // Finish only appears once every Question is answered, so show all 10 on one page.
  await selectPageSize(page, 10);

  const firstQuestion = questionGroup(page, 1);

  await firstQuestion.getByRole("radio", { name: /most recently applied edit/ }).check();
  await firstQuestion.getByRole("button", { name: "Submit" }).click();

  await expect(firstQuestion.getByRole("status")).toContainText("Correct!");
  await expect(page.getByText(/exactly what Undo needs/)).toBeVisible();
  // Locking now disables each answer control individually (the <fieldset> itself
  // stays enabled so the Explanation's read-aloud button keeps working) and
  // unmounts Submit, so assert both the control state and Submit's removal.
  await expect(firstQuestion.getByRole("radio").first()).toBeDisabled();
  await expectLocked(firstQuestion);

  const secondQuestion = questionGroup(page, 2);

  await secondQuestion.getByRole("radio", { name: /enqueue at the back/ }).check();
  await secondQuestion.getByRole("button", { name: "Submit" }).click();
  await expect(secondQuestion.getByRole("status")).toContainText("Correct!");

  const remainingSingleChoiceAnswers: Array<[question: number, correctOption: RegExp]> = [
    [3, /mirroring the undo stack/],
    [4, /Clear it/],
    [5, /C is discarded/],
    [6, /position in the site/],
  ];

  for (const [questionNumber, correctOption] of remainingSingleChoiceAnswers) {
    const question = questionGroup(page, questionNumber);

    await question.getByRole("radio", { name: correctOption }).check();
    await question.getByRole("button", { name: "Submit" }).click();
  }

  const multipleChoiceAnswers: Array<[question: number, correctOptions: RegExp[]]> = [
    [7, [/both acting on the same end/, /core operations are enqueue/, /without removing it/]],
    [8, [/first one reversed/, /walking back through visited pages/]],
    [9, [/drop the oldest/, /naturally a deque/, /can no longer be undone/]],
  ];

  for (const [questionNumber, correctOptions] of multipleChoiceAnswers) {
    const question = questionGroup(page, questionNumber);

    for (const correctOption of correctOptions) {
      await question.getByRole("checkbox", { name: correctOption }).check();
    }

    await question.getByRole("button", { name: "Submit" }).click();
  }

  const inputQuestion = questionGroup(page, 10);

  await inputQuestion.getByLabel("Your answer").fill("deque");
  await inputQuestion.getByRole("button", { name: "Submit" }).click();

  await page.getByRole("button", { name: "Finish" }).click();

  await expect(page.getByRole("heading", { name: "Summary" })).toBeVisible();
  await expect(page.getByRole("status").filter({ hasText: "10 of 10 correct" })).toBeVisible();

  await page.getByRole("button", { name: "Retake" }).click();

  // A fresh Run has nothing submitted yet, so the "answered" counter is hidden.
  await expect(page.getByText(/answered/)).toBeHidden();
  await expect(page.getByText(/exactly what Undo needs/)).toBeHidden();
  await expect(firstQuestion.getByRole("radio").first()).toBeEnabled();
  await expectUnlocked(firstQuestion);
  await expect(firstQuestion.getByRole("button", { name: "Submit" })).toBeDisabled();
});

test("Player checks all Question types with check-answer semantics", async ({ page }) => {
  await seedAndOpenLibraryQuiz(page);

  await page.getByRole("button", { name: "Start" }).click();
  await selectPageSize(page, 10);

  const singleChoice = questionGroup(page, 1);
  await singleChoice.getByRole("radio", { name: "Wrong" }).check();
  await singleChoice.getByRole("button", { name: "Submit" }).click();
  await expect(singleChoice.getByRole("status")).toContainText("Incorrect");

  const partialMultipleChoice = questionGroup(page, 2);
  await partialMultipleChoice.getByRole("checkbox", { name: "Yes", exact: true }).check();
  await partialMultipleChoice.getByRole("button", { name: "Submit" }).click();
  await expect(partialMultipleChoice.getByRole("status")).toContainText("Incorrect");

  const completeMultipleChoice = questionGroup(page, 3);
  await completeMultipleChoice.getByRole("checkbox", { name: "Alpha" }).check();
  await completeMultipleChoice.getByRole("checkbox", { name: "Beta" }).check();
  await completeMultipleChoice.getByRole("button", { name: "Submit" }).click();
  await expect(completeMultipleChoice.getByRole("status")).toContainText("Correct!");

  const textInput = questionGroup(page, 4);
  await textInput.getByLabel("Your answer").fill("  ANSWER  ");
  await textInput.getByRole("button", { name: "Submit" }).click();
  await expect(textInput.getByRole("status")).toContainText("Correct!");

  const numericComma = questionGroup(page, 5);
  await numericComma.getByLabel("Your answer").fill("12,55");
  await numericComma.getByRole("button", { name: "Submit" }).click();
  await expect(numericComma.getByRole("status")).toContainText("Correct!");

  const numericOutsideTolerance = questionGroup(page, 6);
  await numericOutsideTolerance.getByLabel("Your answer").fill("10.4");
  await numericOutsideTolerance.getByRole("button", { name: "Submit" }).click();
  await expect(numericOutsideTolerance.getByRole("status")).toContainText("Incorrect");
});

test("Player resumes an in-progress Run with prior answers locked", async ({ page }) => {
  await seedAndOpenLibraryQuiz(page);

  await page.getByRole("button", { name: "Start" }).click();
  await selectPageSize(page, 1);

  const firstQuestion = questionGroup(page, 1);
  await firstQuestion.getByRole("radio", { name: "Right" }).check();
  await firstQuestion.getByRole("button", { name: "Submit" }).click();

  await page.getByRole("button", { name: "Next page" }).click();

  const secondQuestion = questionGroup(page, 2);
  await secondQuestion.getByRole("checkbox", { name: "Yes", exact: true }).check();
  await secondQuestion.getByRole("button", { name: "Submit" }).click();
  await expect(secondQuestion.getByRole("status")).toContainText("Incorrect");

  await page.reload();

  await expect(page.getByRole("heading", { name: /E2E — Mixed question types/ })).toBeVisible();
  await expect(page.getByText("page 2 of 6")).toBeVisible();

  const resumedSecondQuestion = questionGroup(page, 2);
  await expect(resumedSecondQuestion.getByRole("checkbox").first()).toBeDisabled();
  await expect(resumedSecondQuestion.getByRole("status")).toContainText("Incorrect");

  await page.getByRole("button", { name: "Next page" }).click();
  await expect(questionGroup(page, 3)).toBeVisible();
});

test("Player keeps submitted answers when Page size re-chunks an in-progress Run", async ({
  page,
}) => {
  await seedAndOpenLibraryQuiz(page);

  await page.getByRole("button", { name: "Start" }).click();
  await selectPageSize(page, 1);

  const firstQuestion = questionGroup(page, 1);
  await firstQuestion.getByRole("radio", { name: "Right" }).check();
  await firstQuestion.getByRole("button", { name: "Submit" }).click();

  await page.getByRole("button", { name: "Next page" }).click();

  const secondQuestion = questionGroup(page, 2);
  await secondQuestion.getByRole("checkbox", { name: "Yes", exact: true }).check();
  await secondQuestion.getByRole("button", { name: "Submit" }).click();

  await selectPageSize(page, 3);

  await expect(page.getByRole("heading", { name: /E2E — Mixed question types/ })).toBeVisible();
  await expect(page.getByText("page 1 of 2")).toBeVisible();
  await expect(page.getByText("2 of 6 answered")).toBeVisible();
  await expect(firstQuestion.getByRole("radio").first()).toBeDisabled();
  await expect(firstQuestion.getByRole("status")).toContainText("Correct!");
  await expect(secondQuestion.getByRole("checkbox").first()).toBeDisabled();
  await expect(secondQuestion.getByRole("status")).toContainText("Incorrect");
  await expect(questionGroup(page, 3)).toBeVisible();
});

test("Player Run can be completed with the keyboard", async ({ page }) => {
  await page.goto("/library/");
  await expect(page.getByRole("region", { name: "Your quizzes" })).toBeVisible();
  await seedQuiz(page, singleChoiceQuiz);
  await page.goto(`/library/quiz/?id=${singleChoiceQuiz.id}`);
  await expect(page.getByRole("heading", { name: singleChoiceQuiz.title })).toBeVisible();

  await page.getByRole("button", { name: "Start" }).focus();
  await page.keyboard.press("Enter");
  await expect(page.getByRole("heading", { name: /E2E — Single choice/ })).toBeVisible();
  await expect(page.getByText("page 1 of 1")).toBeVisible();

  const firstQuestion = questionGroup(page, 1);
  // Options are shuffled per load, so address the correct radio by name rather
  // than assuming its position, then check it from the keyboard.
  const correctOption = firstQuestion.getByRole("radio", { name: "0" });
  await correctOption.focus();
  await page.keyboard.press("Space");
  await expect(correctOption).toBeChecked();

  const submit = firstQuestion.getByRole("button", { name: "Submit" });
  await tabUntilFocused(page, submit);
  await page.keyboard.press("Enter");
  await expect(firstQuestion.getByRole("status")).toContainText("Correct!");

  await expect(page.getByText("1 of 1 answered")).toBeVisible();

  const finish = page.getByRole("button", { name: "Finish" });
  await tabUntilFocused(page, finish);
  await page.keyboard.press("Enter");

  await expect(page.getByRole("heading", { name: "Summary" })).toBeVisible();
  await expect(page.getByRole("status").filter({ hasText: "1 of 1 correct" })).toBeVisible();
});

test("Summary 'Review' opens the Question and does not bounce back to the Summary", async ({
  page,
}) => {
  await page.goto("/library/");
  // Wait for the Library to mount so its IndexedDB stores exist before seeding.
  await expect(page.getByRole("region", { name: "Your quizzes" })).toBeVisible();
  await seedQuiz(page, singleChoiceQuiz);
  await page.goto(`/library/quiz/?id=${singleChoiceQuiz.id}`);
  await expect(page.getByRole("heading", { name: singleChoiceQuiz.title })).toBeVisible();

  await page.getByRole("button", { name: "Start" }).click();

  // Single-question Run, so page-scoped locators are unambiguous.
  await page.getByRole("radio", { name: "0" }).click();
  await page.getByRole("button", { name: "Submit" }).click();
  await expect(page.getByText("Correct!")).toBeVisible();

  await page.getByRole("button", { name: "Finish" }).click();
  await expect(page.getByRole("heading", { name: "Summary" })).toBeVisible();

  // Regression: a finished Run forced the Summary view even when the URL anchored
  // a Question, so the emit from "Review" re-ran the load effect and bounced the
  // user straight back. Review must now open the Question and stay there.
  await page.getByRole("button", { name: "Review" }).click();
  await expect(page.getByRole("heading", { name: "Summary" })).toBeHidden();
  await expect(page.getByText(/built-in falsy values/)).toBeVisible();
});

test.describe("phone-first Run layout", () => {
  test.use({
    deviceScaleFactor: devices["Pixel 5"].deviceScaleFactor,
    hasTouch: devices["Pixel 5"].hasTouch,
    isMobile: devices["Pixel 5"].isMobile,
    userAgent: devices["Pixel 5"].userAgent,
    viewport: devices["Pixel 5"].viewport,
  });

  test("Library Run remains usable on a phone viewport", async ({ page }) => {
    await seedAndOpenLibraryQuiz(page);

    await page.getByRole("button", { name: "Start" }).click();

    await expect(page.getByRole("heading", { name: /E2E — Mixed question types/ })).toBeVisible();
    await expect(page.getByText("page 1 of 2")).toBeVisible();
    await expect(pageSizeSelect(page)).toBeVisible();
    await expect(questionGroup(page, 1)).toBeVisible();

    await expect
      .poll(() => page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth))
      .toBe(true);
  });
});
