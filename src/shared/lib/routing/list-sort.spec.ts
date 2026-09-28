import { describe, expect, test } from "vitest";

import { appendListSort, isDefaultListSort, parseListSort } from "./list-sort";

describe("parseListSort", () => {
  test("defaults to alphabetical ascending", () => {
    expect(parseListSort("")).toEqual({ key: "abc", order: "asc" });
  });

  test("date defaults to descending", () => {
    expect(parseListSort("?sort=date")).toEqual({ key: "date", order: "desc" });
  });

  test("reads an explicit order and ignores invalid values", () => {
    expect(parseListSort("?sort=date&order=asc")).toEqual({ key: "date", order: "asc" });
    expect(parseListSort("?sort=size&order=up")).toEqual({ key: "abc", order: "asc" });
  });
});

describe("appendListSort", () => {
  test("omits default params", () => {
    expect(appendListSort("", { key: "abc", order: "asc" })).toBe("");
    expect(appendListSort("", { key: "date", order: "desc" })).toBe("?sort=date");
  });

  test("appends to an existing query and round-trips", () => {
    const query = appendListSort("?tags=css", { key: "abc", order: "desc" });

    expect(query).toBe("?tags=css&order=desc");
    expect(parseListSort(query)).toEqual({ key: "abc", order: "desc" });
    expect(isDefaultListSort(parseListSort(query))).toBe(false);
  });
});
