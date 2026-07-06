export type ListTagMatchMode = "and" | "or";

export interface ListUrlState {
  selectedTags: string[];
  tagMatchMode: ListTagMatchMode;
  titleQuery: string;
  page: number;
}

const TAGS_PARAM = "tags";
const TITLE_QUERY_PARAM = "q";
const TAG_MATCH_MODE_PARAM = "mode";
const PAGE_PARAM = "page";

const DEFAULT_TAG_MATCH_MODE: ListTagMatchMode = "and";

export function parseListUrlState(
  search: string,
  availableTags: readonly string[],
  defaultPage = 1,
): ListUrlState {
  const params = new URLSearchParams(search);
  const availableTagSet = new Set(availableTags);
  const selectedTagSet = new Set(
    params
      .get(TAGS_PARAM)
      ?.split(",")
      .map((tag) => tag.trim())
      .filter((tag) => availableTagSet.has(tag)) ?? [],
  );
  const tagMatchMode = params.get(TAG_MATCH_MODE_PARAM) === "or" ? "or" : "and";
  const titleQuery = params.get(TITLE_QUERY_PARAM)?.trim() ?? "";

  return {
    selectedTags: availableTags.filter((tag) => selectedTagSet.has(tag)),
    tagMatchMode,
    titleQuery,
    page: parsePositivePage(params.get(PAGE_PARAM), defaultPage),
  };
}

export function stringifyListUrlState(
  state: ListUrlState,
  availableTags: readonly string[],
): string {
  const params = new URLSearchParams();
  const availableTagSet = new Set(availableTags);
  const selectedTags = state.selectedTags.filter((tag) => availableTagSet.has(tag));
  const titleQuery = state.titleQuery.trim();
  const page = normalizePage(state.page);
  const queryParts: string[] = [];

  if (selectedTags.length > 0) {
    queryParts.push(`${TAGS_PARAM}=${selectedTags.map(encodeURIComponent).join(",")}`);
  }

  if (titleQuery !== "") params.set(TITLE_QUERY_PARAM, titleQuery);
  if (state.tagMatchMode !== DEFAULT_TAG_MATCH_MODE) {
    params.set(TAG_MATCH_MODE_PARAM, state.tagMatchMode);
  }
  if (page > 1) params.set(PAGE_PARAM, String(page));

  const otherParams = params.toString();
  if (otherParams !== "") queryParts.push(otherParams);

  return queryParts.length === 0 ? "" : `?${queryParts.join("&")}`;
}

export function hasActiveListFilters(state: ListUrlState): boolean {
  return (
    state.selectedTags.length > 0 ||
    state.titleQuery.trim() !== "" ||
    state.tagMatchMode !== DEFAULT_TAG_MATCH_MODE
  );
}

export function clampPage(page: number, pageCount: number): number {
  return Math.min(normalizePage(page), Math.max(normalizePage(pageCount), 1));
}

function parsePositivePage(value: string | null, fallback: number): number {
  if (value === null) return normalizePage(fallback);

  return normalizePage(Number(value));
}

function normalizePage(page: number): number {
  return Number.isSafeInteger(page) && page > 0 ? page : 1;
}
