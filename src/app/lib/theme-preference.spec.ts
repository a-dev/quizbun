import { describe, expect, test } from "vitest";

import {
  getToggledThemePreference,
  normalizeThemePreference,
  RESOLVED_THEMES,
  resolveThemePreference,
  THEME_PREFERENCES,
  type ResolvedTheme,
  type ThemePreference,
} from "./theme-preference";

const renderedTheme = (preference: ThemePreference, systemTheme: ResolvedTheme) =>
  preference === "system" ? systemTheme : preference;

describe("theme preference", () => {
  test("normalizes unknown values to system", () => {
    expect(normalizeThemePreference("light")).toBe("light");
    expect(normalizeThemePreference("dark")).toBe("dark");
    expect(normalizeThemePreference("system")).toBe("system");
    expect(normalizeThemePreference("sepia")).toBe("system");
    expect(normalizeThemePreference(null)).toBe("system");
  });

  test("toggles to the opposite of what is on screen", () => {
    // System is light: "system" and "light" both render light, so both flip to dark.
    expect(getToggledThemePreference("system", "light")).toBe("dark");
    expect(getToggledThemePreference("light", "light")).toBe("dark");
    expect(getToggledThemePreference("dark", "light")).toBe("system");

    // System is dark, mirrored.
    expect(getToggledThemePreference("system", "dark")).toBe("light");
    expect(getToggledThemePreference("dark", "dark")).toBe("light");
    expect(getToggledThemePreference("light", "dark")).toBe("system");
  });

  test("never pins a preference that already matches the system theme", () => {
    RESOLVED_THEMES.forEach((systemTheme) => {
      THEME_PREFERENCES.forEach((preference) => {
        expect(getToggledThemePreference(preference, systemTheme)).not.toBe(systemTheme);
      });
    });
  });

  test("toggling twice returns to the theme it started on", () => {
    RESOLVED_THEMES.forEach((systemTheme) => {
      THEME_PREFERENCES.forEach((preference) => {
        const once = getToggledThemePreference(preference, systemTheme);
        const twice = getToggledThemePreference(once, systemTheme);

        expect(renderedTheme(twice, systemTheme)).toBe(renderedTheme(preference, systemTheme));
      });
    });
  });

  test("keeps an explicit preference that the system theme has caught up with", () => {
    // Pinned light while the system was dark, then the system turns light:
    // the pin survives, and the toggle still offers a way out of it.
    expect(getToggledThemePreference("light", "light")).toBe("dark");
    expect(getToggledThemePreference("dark", "light")).toBe("system");
  });

  test("resolves explicit preferences without reading system settings", () => {
    expect(resolveThemePreference("light")).toBe("light");
    expect(resolveThemePreference("dark")).toBe("dark");
  });
});
