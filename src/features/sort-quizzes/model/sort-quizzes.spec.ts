import { describe, expect, test } from "vitest";

import { sortQuizItems } from "./sort-quizzes";

const items = [
  { id: "b", title: "beta", addedAt: "2026-01-02T00:00:00Z" },
  { id: "a", title: "Alpha", addedAt: "2026-01-03T00:00:00Z" },
  { id: "c", title: "gamma", addedAt: "2026-01-01T00:00:00Z" },
  { id: "d", title: "Delta", addedAt: "2026-01-01T00:00:00Z" },
];

const addedAtOf = (item: (typeof items)[number]) => Date.parse(item.addedAt);
const ids = (sorted: typeof items) => sorted.map((item) => item.id);

describe("sortQuizItems", () => {
  test("sorts titles case-insensitively in both directions", () => {
    expect(ids(sortQuizItems(items, { key: "abc", order: "asc" }, addedAtOf))).toEqual([
      "a",
      "b",
      "d",
      "c",
    ]);
    expect(ids(sortQuizItems(items, { key: "abc", order: "desc" }, addedAtOf))).toEqual([
      "c",
      "d",
      "b",
      "a",
    ]);
  });

  test("sorts by date with id as the tiebreaker", () => {
    expect(ids(sortQuizItems(items, { key: "date", order: "desc" }, addedAtOf))).toEqual([
      "a",
      "b",
      "c",
      "d",
    ]);
    expect(ids(sortQuizItems(items, { key: "date", order: "asc" }, addedAtOf))).toEqual([
      "c",
      "d",
      "b",
      "a",
    ]);
  });

  test("does not mutate its input", () => {
    const copy = [...items];
    sortQuizItems(items, { key: "abc", order: "asc" }, addedAtOf);
    expect(items).toEqual(copy);
  });
});
