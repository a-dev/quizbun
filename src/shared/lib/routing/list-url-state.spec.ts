import { describe, expect, test } from "vitest";

import {
  clampPage,
  hasActiveListFilters,
  parseListUrlState,
  stringifyListUrlState,
  tagFilterHref,
} from "./list-url-state";
import type { ListUrlState } from "./list-url-state";
import { withBase } from "./with-base";

const availableTags = ["css", "javascript", "web"] as const;

describe("parseListUrlState", () => {
  test("reads tags, title query, tag match mode, and page", () => {
    expect(parseListUrlState("?tags=web,css&q=layout&mode=or&page=3", availableTags)).toEqual({
      selectedTags: ["css", "web"],
      tagMatchMode: "or",
      titleQuery: "layout",
      page: 3,
    });
  });

  test("ignores unavailable tags and invalid pages", () => {
    expect(parseListUrlState("?tags=css,gone&page=-2", availableTags, 4)).toEqual({
      selectedTags: ["css"],
      tagMatchMode: "and",
      titleQuery: "",
      page: 1,
    });
  });

  test("uses the default page when no page param exists", () => {
    expect(parseListUrlState("?tags=web", availableTags, 2).page).toBe(2);
  });

  test("trims whitespace around each tag and around the title query", () => {
    expect(parseListUrlState("?tags= web , css &q=%20%20layout%20%20", availableTags)).toEqual({
      selectedTags: ["css", "web"],
      tagMatchMode: "and",
      titleQuery: "layout",
      page: 1,
    });
  });

  test("returns empty selections when the params are absent", () => {
    expect(parseListUrlState("", availableTags)).toEqual({
      selectedTags: [],
      tagMatchMode: "and",
      titleQuery: "",
      page: 1,
    });
  });
});

describe("stringifyListUrlState", () => {
  test("writes canonical query params and omits defaults", () => {
    expect(
      stringifyListUrlState(
        {
          selectedTags: ["css", "web"],
          tagMatchMode: "or",
          titleQuery: " layout ",
          page: 2,
        },
        availableTags,
      ),
    ).toBe("?tags=css,web&q=layout&mode=or&page=2");
  });

  test("omits empty values and unavailable tags", () => {
    expect(
      stringifyListUrlState(
        {
          selectedTags: ["css", "gone"],
          tagMatchMode: "and",
          titleQuery: "",
          page: 1,
        },
        availableTags,
      ),
    ).toBe("?tags=css");
  });

  test("writes no tags param when nothing is selected", () => {
    expect(
      stringifyListUrlState(
        { selectedTags: [], tagMatchMode: "or", titleQuery: "", page: 1 },
        availableTags,
      ),
    ).toBe("?mode=or");
  });

  test("returns an empty string when every value is a default", () => {
    expect(
      stringifyListUrlState(
        { selectedTags: [], tagMatchMode: "and", titleQuery: "", page: 1 },
        availableTags,
      ),
    ).toBe("");
  });
});

describe("tagFilterHref", () => {
  test("links a list filtered to exactly that Tag", () => {
    expect(tagFilterHref("quizzes/", "advanced")).toBe(`${withBase("quizzes/")}?tags=advanced`);
    expect(tagFilterHref("library/", "css")).toBe(`${withBase("library/")}?tags=css`);
  });
});

describe("hasActiveListFilters", () => {
  const inactive: ListUrlState = {
    selectedTags: [],
    tagMatchMode: "and",
    titleQuery: "",
    page: 1,
  };

  test("a selected tag is a filter", () => {
    expect(hasActiveListFilters({ ...inactive, selectedTags: ["css"] })).toBe(true);
  });

  test("a non-blank title query is a filter", () => {
    expect(hasActiveListFilters({ ...inactive, titleQuery: "layout" })).toBe(true);
    expect(hasActiveListFilters({ ...inactive, titleQuery: "   " })).toBe(false);
  });

  test("a non-default tag match mode is a filter", () => {
    expect(hasActiveListFilters({ ...inactive, tagMatchMode: "or" })).toBe(true);
  });

  test("does not treat pagination as filtering", () => {
    expect(
      hasActiveListFilters({
        selectedTags: [],
        tagMatchMode: "and",
        titleQuery: "",
        page: 3,
      }),
    ).toBe(false);
  });
});

describe("clampPage", () => {
  test("clamps to the available page range", () => {
    expect(clampPage(0, 4)).toBe(1);
    expect(clampPage(3, 4)).toBe(3);
    expect(clampPage(7, 4)).toBe(4);
  });
});
