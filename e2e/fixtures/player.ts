import { expect, type Locator, type Page } from "@playwright/test";

/**
 * Shared locators/actions for driving a Run in e2e specs.
 *
 * These mirror the player's current DOM so a single redesign only updates one
 * place. Three details that trip up naive locators:
 *
 * - A Question card is a wrapper carrying `data-question-number` (the global
 *   1-based number) around a `<fieldset>` of answer controls and, once
 *   submitted, a sibling `role="status"` result. `questionGroup` returns that
 *   wrapper so a single locator scopes both the controls and the verdict.
 * - Locking is per-control (the `<fieldset>` is *not* `disabled`, so the
 *   Explanation's read-aloud button stays operable) and the Submit button
 *   unmounts — so "is this Question locked?" is asserted via `expectLocked`.
 * - "Questions per page" is a Base UI `Select` (a `combobox` opening a portalled
 *   `listbox` of `option`s), not a native `<select>` — so it is opened and
 *   picked, never `selectOption`-ed.
 */

/** The Question card, addressed by its global 1-based Question number. */
export function questionGroup(page: Page, questionNumber: number): Locator {
  return page.locator(`[data-question-number="${questionNumber}"]`);
}

/** A submitted Question hides Submit and disables its answer controls. */
export async function expectLocked(group: Locator): Promise<void> {
  await expect(group.getByRole("button", { name: "Submit" })).toBeHidden();
}

/** An unsubmitted Question still offers Submit (disabled until a valid draft). */
export async function expectUnlocked(group: Locator): Promise<void> {
  await expect(group.getByRole("button", { name: "Submit" })).toBeVisible();
}

/** The Page-size Select. Scoped to `<main>` so it never collides with the
 * footer's read-aloud voice picker, which is also a `combobox`. */
export function pageSizeSelect(page: Page): Locator {
  return page.getByRole("main").getByRole("combobox");
}

/** Open the Page-size Select and choose a size (one of the `PAGE_SIZES`). */
export async function selectPageSize(page: Page, size: number): Promise<void> {
  await pageSizeSelect(page).click();
  // The listbox is portalled to <body>, so options stay page-scoped; the exact
  // numeric name keeps them distinct from the voice picker's option labels.
  await page.getByRole("option", { name: String(size), exact: true }).click();
}
