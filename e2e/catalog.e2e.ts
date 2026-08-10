import { expect, test, type Locator, type Page } from "@playwright/test";

import { QUIZZES_PER_PAGE } from "../src/shared/lib/routing";

// This spec is deliberately content-agnostic: it derives every expectation from
// whatever `content/quizzes/` currently holds instead of naming quiz titles or
// pinning them to a page number. Adding a quiz shifts the alphabetical order and
// therefore which titles land on which Catalog page — a spec that hardcodes them
// fails on every contribution, which is noise, not signal.

function quizCards(page: Page): Locator {
  return page.getByRole("article");
}

function cardTitles(page: Page): Promise<string[]> {
  return quizCards(page).getByRole("heading").allInnerTexts();
}

function tagFilterCombobox(page: Page): Locator {
  return page.getByRole("combobox", { name: "Filter by tags and / or" });
}

/**
 * Opens the Tag combobox and selects the most-used Tag — the widest filter the
 * Catalog offers, so the assertions below run against a real result set rather
 * than a lone quiz. Returns the Tag with the quiz count its option advertises
 * (`tag (7)`), which the filtered Catalog then has to agree with.
 */
async function selectMostCommonTag(page: Page): Promise<{ tag: string; count: number }> {
  await page.getByTestId("combobox-trigger").click();

  const options = page.getByRole("option");
  const labels = await options.allInnerTexts();
  const parsed = labels.map((label, index) => {
    const match = /^(?<tag>.+) \((?<count>\d+)\)$/.exec(label.trim());

    expect(match, `Tag option "${label}" does not look like "tag (count)"`).not.toBeNull();

    return { tag: match!.groups!.tag!, count: Number(match!.groups!.count), index };
  });

  expect(parsed.length).toBeGreaterThan(0);

  const widest = parsed.reduce((best, entry) => (entry.count > best.count ? entry : best));

  expect(widest.count).toBeGreaterThan(1);

  await options.nth(widest.index).click();
  await page.keyboard.press("Escape");

  return { tag: widest.tag, count: widest.count };
}

/** Every rendered card really carries the Tag — a count alone wouldn't prove that. */
async function expectEveryCardTagged(page: Page, tag: string) {
  const cards = quizCards(page);
  const cardCount = await cards.count();

  expect(cardCount).toBeGreaterThan(0);

  for (let index = 0; index < cardCount; index += 1) {
    const tags = await cards.nth(index).getByLabel("Tags").locator("div").allInnerTexts();

    expect(tags.map((text) => text.trim())).toContain(tag);
  }
}

test("Catalog lists Quizzes, filters by Tags, syncs deep links, and opens a Quiz", async ({
  page,
}) => {
  await page.goto("/quizzes/");
  await page.waitForLoadState("networkidle");

  await expect(page.getByRole("heading", { name: "Quizzes" })).toBeVisible();
  await expect(quizCards(page)).toHaveCount(QUIZZES_PER_PAGE);

  const firstPageTitles = await cardTitles(page);

  await page.getByRole("link", { name: "Page 2" }).click();
  await expect(page).toHaveURL(/\/quizzes\/page\/2\/$/);

  const secondPageTitles = await cardTitles(page);

  expect(secondPageTitles.length).toBeGreaterThan(0);
  expect(secondPageTitles.filter((title) => firstPageTitles.includes(title))).toEqual([]);

  await page.goto("/quizzes/");

  const { tag, count } = await selectMostCommonTag(page);
  // A Tag with more matches than one page still paginates.
  const filteredCardCount = Math.min(count, QUIZZES_PER_PAGE);

  await expect(tagFilterCombobox(page)).toContainText(tag);
  await expect.poll(() => new URL(page.url()).searchParams.getAll("tags")).toEqual([tag]);
  await expect(quizCards(page)).toHaveCount(filteredCardCount);
  await expectEveryCardTagged(page, tag);

  await page.goto(`/quizzes/?tags=${encodeURIComponent(tag)}`);

  await expect(tagFilterCombobox(page)).toContainText(tag);
  await expect(quizCards(page)).toHaveCount(filteredCardCount);
  await expectEveryCardTagged(page, tag);

  const firstCard = quizCards(page).first();
  const quizTitle = (await firstCard.getByRole("heading").innerText()).trim();

  await firstCard.getByRole("link").click();

  await expect(page).toHaveURL(/\/quizzes\/[^/]+\/$/);
  await expect(page.getByRole("heading", { name: quizTitle, level: 1 })).toBeVisible();
  await expect(page.getByRole("button", { name: "Start" })).toBeVisible();
});
