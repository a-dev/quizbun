import { describe, expect, test } from "vitest";

import {
  clampPage,
  hasActiveListFilters,
  parseListUrlState,
  stringifyListUrlState,
} from "./list-url-state";

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
});

describe("hasActiveListFilters", () => {
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
