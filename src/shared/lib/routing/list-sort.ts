export type ListSortKey = "abc" | "date";
export type ListSortOrder = "asc" | "desc";

export interface ListSort {
  key: ListSortKey;
  order: ListSortOrder;
}

const SORT_PARAM = "sort";
const ORDER_PARAM = "order";

/** Each key opens in its natural direction: titles A→Z, dates newest first. */
export const DEFAULT_SORT_ORDER: Readonly<Record<ListSortKey, ListSortOrder>> = {
  abc: "asc",
  date: "desc",
};

export const DEFAULT_LIST_SORT: ListSort = { key: "abc", order: DEFAULT_SORT_ORDER.abc };

export function parseListSort(search: string): ListSort {
  const params = new URLSearchParams(search);
  const key: ListSortKey = params.get(SORT_PARAM) === "date" ? "date" : "abc";
  const rawOrder = params.get(ORDER_PARAM);
  const order: ListSortOrder =
    rawOrder === "asc" || rawOrder === "desc" ? rawOrder : DEFAULT_SORT_ORDER[key];

  return { key, order };
}

/**
 * Appends the sort to an existing `?…` query (or `""`). Each param is written
 * only when it differs from its default, so `?sort=date` means newest first.
 */
export function appendListSort(query: string, sort: ListSort): string {
  const params = new URLSearchParams();

  if (sort.key !== DEFAULT_LIST_SORT.key) params.set(SORT_PARAM, sort.key);
  if (sort.order !== DEFAULT_SORT_ORDER[sort.key]) params.set(ORDER_PARAM, sort.order);

  const sortQuery = params.toString();
  if (sortQuery === "") return query;

  return query === "" ? `?${sortQuery}` : `${query}&${sortQuery}`;
}

export function isDefaultListSort(sort: ListSort): boolean {
  return sort.key === DEFAULT_LIST_SORT.key && sort.order === DEFAULT_LIST_SORT.order;
}
