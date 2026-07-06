import { describe, expect, test } from "vitest";

import { collectTags, filterQuizItems, matchesTagFilter, prepareFilterItems } from "./tag-filter";

describe("collectTags", () => {
  test("deduplicates and sorts tags across items", () => {
    const items = [{ tags: ["typescript", "basics"] }, { tags: ["basics", "arrays"] }];

    expect(collectTags(items)).toEqual(["arrays", "basics", "typescript"]);
  });

  test("returns an empty list for untagged items", () => {
    expect(collectTags([{ tags: [] }, { tags: [] }])).toEqual([]);
  });
});

describe("matchesTagFilter", () => {
  test("empty selection matches everything", () => {
    expect(matchesTagFilter([], [])).toBe(true);
    expect(matchesTagFilter(["a"], [])).toBe(true);
  });

  test("requires every selected tag (AND semantics)", () => {
    expect(matchesTagFilter(["a", "b"], ["a"])).toBe(true);
    expect(matchesTagFilter(["a", "b"], ["a", "b"])).toBe(true);
    expect(matchesTagFilter(["a"], ["a", "b"])).toBe(false);
    expect(matchesTagFilter([], ["a"])).toBe(false);
  });

  test("accepts any selected tag with OR semantics", () => {
    expect(matchesTagFilter(["a"], ["a", "b"], "or")).toBe(true);
    expect(matchesTagFilter(["c"], ["a", "b"], "or")).toBe(false);
    expect(matchesTagFilter([], ["a"], "or")).toBe(false);
  });
});

describe("filterQuizItems", () => {
  const items = [
    { id: "react-hooks", title: "React Hooks Basics", tags: ["react", "basics"] },
    { id: "css-grid", title: "CSS Grid Layout", tags: ["css", "layout"] },
    { id: "react-performance", title: "React Rendering Performance", tags: ["react", "advanced"] },
  ];

  test("keeps source order when the title query is empty", () => {
    expect(
      filterQuizItems(prepareFilterItems(items), {
        selectedTags: [],
        tagMatchMode: "and",
        titleQuery: "",
      }).map((item) => item.id),
    ).toEqual(["react-hooks", "css-grid", "react-performance"]);
  });

  test("filters by fuzzy title query", () => {
    expect(
      filterQuizItems(prepareFilterItems(items), {
        selectedTags: [],
        tagMatchMode: "and",
        titleQuery: "grid",
      }).map((item) => item.id),
    ).toEqual(["css-grid"]);
  });

  test("combines title and AND tag filters", () => {
    expect(
      filterQuizItems(prepareFilterItems(items), {
        selectedTags: ["advanced"],
        tagMatchMode: "and",
        titleQuery: "react",
      }).map((item) => item.id),
    ).toEqual(["react-performance"]);
  });

  test("combines title and OR tag filters", () => {
    expect(
      filterQuizItems(prepareFilterItems(items), {
        selectedTags: ["layout", "advanced"],
        tagMatchMode: "or",
        titleQuery: "",
      }).map((item) => item.id),
    ).toEqual(["css-grid", "react-performance"]);
  });
});
