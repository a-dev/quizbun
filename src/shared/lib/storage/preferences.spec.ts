import { beforeEach, describe, expect, test } from "vitest";

import { DEFAULT_PAGE_SIZE, getPageSize, setPageSize } from "./preferences";

function fakeLocalStorage(): Storage {
  const entries = new Map<string, string>();

  return {
    getItem: (key) => entries.get(key) ?? null,
    setItem: (key, value) => void entries.set(key, value),
    removeItem: (key) => void entries.delete(key),
    clear: () => entries.clear(),
    key: (index) => [...entries.keys()][index] ?? null,
    get length() {
      return entries.size;
    },
  };
}

beforeEach(() => {
  globalThis.localStorage = fakeLocalStorage();
});

describe("page size preference", () => {
  test("defaults to 5 when nothing is stored", () => {
    expect(getPageSize()).toBe(DEFAULT_PAGE_SIZE);
  });

  test("round-trips a valid value", () => {
    setPageSize(10);
    expect(getPageSize()).toBe(10);
  });

  test.each(["7", "abc", "", "NaN"])("invalid stored value %j falls back to the default", (raw) => {
    localStorage.setItem("quizbun.page-size", raw);
    expect(getPageSize()).toBe(DEFAULT_PAGE_SIZE);
  });

  test("unavailable localStorage falls back to the default", () => {
    globalThis.localStorage = {
      ...fakeLocalStorage(),
      getItem: () => {
        throw new Error("denied");
      },
    };

    expect(getPageSize()).toBe(DEFAULT_PAGE_SIZE);
  });
});
