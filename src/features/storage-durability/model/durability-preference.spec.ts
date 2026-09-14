import { beforeEach, describe, expect, test } from "vitest";

import { fakeLocalStorage } from "@/shared/lib/storage/fake-local-storage";

import {
  getDurabilityDismissal,
  isDurabilityNoticeDismissed,
  setDurabilityDismissal,
} from "./durability-preference";

beforeEach(() => {
  globalThis.localStorage = fakeLocalStorage();
});

describe("durability notice dismissal", () => {
  test("is absent until dismissed", () => {
    expect(getDurabilityDismissal()).toBeNull();
  });

  test("round-trips the Library state it was dismissed in", () => {
    setDurabilityDismissal("data-stored");
    expect(getDurabilityDismissal()).toBe("data-stored");
  });

  test.each(["true", "", "yes", "library"])(
    "unrecognized value %j reads as not dismissed",
    (raw) => {
      localStorage.setItem("quizbun.durability-notice-dismissed", raw);
      expect(getDurabilityDismissal()).toBeNull();
    },
  );

  test("unavailable localStorage reads as not dismissed", () => {
    globalThis.localStorage = {
      ...fakeLocalStorage(),
      getItem: () => {
        throw new Error("denied");
      },
    };

    expect(getDurabilityDismissal()).toBeNull();
  });
});

describe("whether the notice is suppressed", () => {
  test("shows while never dismissed", () => {
    expect(isDurabilityNoticeDismissed(null, false)).toBe(false);
    expect(isDurabilityNoticeDismissed(null, true)).toBe(false);
  });

  test("an empty-Library dismissal holds while the Library stays empty", () => {
    expect(isDurabilityNoticeDismissed("nothing-stored", false)).toBe(true);
  });

  // The isolation warning only becomes true once quizzes exist, so a dismissal
  // taken when there was nothing to lose must not hide it.
  test("an empty-Library dismissal lapses once quizzes exist", () => {
    expect(isDurabilityNoticeDismissed("nothing-stored", true)).toBe(false);
  });

  test("a populated-Library dismissal is final in either state", () => {
    expect(isDurabilityNoticeDismissed("data-stored", true)).toBe(true);
    expect(isDurabilityNoticeDismissed("data-stored", false)).toBe(true);
  });
});
