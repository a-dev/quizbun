import { describe, expect, test } from "vitest";

import {
  getNextThemePreference,
  normalizeThemePreference,
  resolveThemePreference,
} from "./theme-preference";

describe("theme preference", () => {
  test("normalizes unknown values to system", () => {
    expect(normalizeThemePreference("light")).toBe("light");
    expect(normalizeThemePreference("dark")).toBe("dark");
    expect(normalizeThemePreference("system")).toBe("system");
    expect(normalizeThemePreference("sepia")).toBe("system");
    expect(normalizeThemePreference(null)).toBe("system");
  });

  test("cycles through all preferences", () => {
    expect(getNextThemePreference("light")).toBe("dark");
    expect(getNextThemePreference("dark")).toBe("system");
    expect(getNextThemePreference("system")).toBe("light");
  });

  test("resolves explicit preferences without reading system settings", () => {
    expect(resolveThemePreference("light")).toBe("light");
    expect(resolveThemePreference("dark")).toBe("dark");
  });
});
