import fuzzysort from "fuzzysort";

export type TagFilterMode = "and" | "or";

export interface FilterableQuizItem {
  title: string;
  tags: readonly string[];
}

export interface PreparedFilterItem<Item extends FilterableQuizItem> {
  item: Item;
  preparedTitle: Fuzzysort.Prepared;
  tagSet: ReadonlySet<string>;
}

export interface QuizFilterState {
  selectedTags: readonly string[];
  tagMatchMode: TagFilterMode;
  titleQuery: string;
}

/** Unique tags across all items, sorted for stable presentation. */
export function collectTags(taggedItems: ReadonlyArray<{ tags: readonly string[] }>): string[] {
  const tags = new Set(taggedItems.flatMap((item) => item.tags));

  return [...tags].sort((a, b) => a.localeCompare(b));
}

/**
 * By default, an item matches when it carries every selected tag (AND semantics).
 * An empty selection matches everything.
 */
export function matchesTagFilter(
  itemTags: readonly string[],
  selectedTags: readonly string[],
  tagMatchMode: TagFilterMode = "and",
): boolean {
  if (selectedTags.length === 0) return true;

  return matchesPreparedTagFilter(new Set(itemTags), selectedTags, tagMatchMode);
}

export function prepareFilterItems<Item extends FilterableQuizItem>(
  items: readonly Item[],
): PreparedFilterItem<Item>[] {
  return items.map((item) => ({
    item,
    preparedTitle: fuzzysort.prepare(item.title),
    tagSet: new Set(item.tags),
  }));
}

export function filterQuizItems<Item extends FilterableQuizItem>(
  preparedItems: readonly PreparedFilterItem<Item>[],
  { selectedTags, tagMatchMode, titleQuery }: QuizFilterState,
): Item[] {
  const normalizedTitleQuery = titleQuery.trim();
  const tagFilteredItems =
    selectedTags.length === 0
      ? preparedItems
      : preparedItems.filter((preparedItem) =>
          matchesPreparedTagFilter(preparedItem.tagSet, selectedTags, tagMatchMode),
        );

  if (normalizedTitleQuery.length === 0) {
    return tagFilteredItems.map((preparedItem) => preparedItem.item);
  }

  return fuzzysort
    .go(normalizedTitleQuery, tagFilteredItems, { key: "preparedTitle" })
    .map((result) => result.obj.item);
}

function matchesPreparedTagFilter(
  itemTags: ReadonlySet<string>,
  selectedTags: readonly string[],
  tagMatchMode: TagFilterMode,
): boolean {
  if (tagMatchMode === "or") {
    return selectedTags.some((tag) => itemTags.has(tag));
  }

  return selectedTags.every((tag) => itemTags.has(tag));
}
