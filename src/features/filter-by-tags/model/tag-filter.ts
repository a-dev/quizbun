import fuzzysort, { type SnapshotKey } from "fuzzysort";

export type TagFilterMode = "and" | "or";

export interface FilterableQuizItem {
  title: string;
  tags: readonly string[];
}

export interface PreparedFilterItem<Item extends FilterableQuizItem> {
  item: Item;
  tagSet: ReadonlySet<string>;
}

export interface PreparedFilterItems<Item extends FilterableQuizItem> {
  entries: readonly PreparedFilterItem<Item>[];
  titleIndex: SnapshotKey<PreparedFilterItem<Item>>;
}

export interface QuizFilterState {
  selectedTags: readonly string[];
  tagMatchMode: TagFilterMode;
  titleQuery: string;
}

// override a fuzzysort v4 default
const TITLE_SEARCH_OPTIONS = { limit: 0, threshold: 0 } as const;

export function collectTags(taggedItems: ReadonlyArray<{ tags: readonly string[] }>): string[] {
  const tags = new Set(taggedItems.flatMap((item) => item.tags));

  return [...tags].sort((a, b) => a.localeCompare(b));
}

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
): PreparedFilterItems<Item> {
  const entries = items.map((item) => ({ item, tagSet: new Set(item.tags) }));

  return {
    entries,
    titleIndex: fuzzysort.snapshot(entries, { key: (entry) => entry.item.title }),
  };
}

export function filterQuizItems<Item extends FilterableQuizItem>(
  { entries, titleIndex }: PreparedFilterItems<Item>,
  { selectedTags, tagMatchMode, titleQuery }: QuizFilterState,
): Item[] {
  const normalizedTitleQuery = titleQuery.trim();

  const matchedEntries =
    normalizedTitleQuery.length === 0
      ? entries
      : fuzzysort
          .go(normalizedTitleQuery, titleIndex, TITLE_SEARCH_OPTIONS)
          .map((result) => result.obj);

  if (selectedTags.length === 0) {
    return matchedEntries.map((entry) => entry.item);
  }

  return matchedEntries
    .filter((entry) => matchesPreparedTagFilter(entry.tagSet, selectedTags, tagMatchMode))
    .map((entry) => entry.item);
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
