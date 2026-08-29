import { describe, expect, test } from "vitest";

import {
  COLOR_SCHEME_META_SELECTOR,
  createThemeBootstrapScript,
  getToggledThemePreference,
  metaColorSchemeFor,
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

  test("narrows the color-scheme metadata to a pinned scheme", () => {
    // The browser reads <meta name="color-scheme"> before any stylesheet, so a
    // pinned theme has to be reflected there and not only in the cascade.
    expect(metaColorSchemeFor("light")).toBe("light");
    expect(metaColorSchemeFor("dark")).toBe("dark");
    // Following the system means advertising support for both schemes.
    expect(metaColorSchemeFor("system")).toBe("light dark");
  });

  test("keeps the bootstrap script in step with the meta tag", () => {
    // The script runs before hydration and is generated as a string, so it
    // cannot import the helper above; this catches the two drifting apart.
    const script = createThemeBootstrapScript();

    expect(script).toContain(JSON.stringify(COLOR_SCHEME_META_SELECTOR));
    expect(script).toContain("'light dark'");
  });
});
