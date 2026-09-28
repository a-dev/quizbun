import type { ListSort } from "@/shared/lib/routing";

export interface SortableQuizItem {
  id: string;
  title: string;
}

/**
 * Returns a sorted copy. `timeOf` supplies the date in epoch milliseconds (the
 * Catalog's `addedAt`, the Library's `importedAt`). Ties fall back to the id,
 * ascending, in both directions.
 */
export function sortQuizItems<Item extends SortableQuizItem>(
  items: readonly Item[],
  sort: ListSort,
  timeOf: (item: Item) => number,
): Item[] {
  const direction = sort.order === "asc" ? 1 : -1;

  return [...items].sort((left, right) => {
    const primary =
      sort.key === "abc"
        ? left.title.localeCompare(right.title, "en", { sensitivity: "base" })
        : timeOf(left) - timeOf(right);

    if (primary !== 0) return primary * direction;

    return left.id.localeCompare(right.id, "en");
  });
}
