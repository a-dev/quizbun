export const THEME_STORAGE_KEY = "quizbun-theme";
export const THEME_ATTRIBUTE = "data-theme";
export const THEME_PREFERENCE_ATTRIBUTE = "data-theme-preference";
export const THEME_MEDIA_QUERY = "(prefers-color-scheme: dark)";

export const THEME_PREFERENCES = ["light", "dark", "system"] as const;

export type ThemePreference = (typeof THEME_PREFERENCES)[number];
export type ResolvedTheme = Exclude<ThemePreference, "system">;

function canUseDOM() {
  return typeof document !== "undefined";
}

function canUseStorage() {
  return typeof window !== "undefined" && typeof window.localStorage !== "undefined";
}

export function isThemePreference(value: unknown): value is ThemePreference {
  return typeof value === "string" && THEME_PREFERENCES.includes(value as ThemePreference);
}

export function normalizeThemePreference(value: unknown): ThemePreference {
  return isThemePreference(value) ? value : "system";
}

export function getNextThemePreference(preference: ThemePreference): ThemePreference {
  const currentIndex = THEME_PREFERENCES.indexOf(preference);
  const nextIndex = (currentIndex + 1) % THEME_PREFERENCES.length;

  return THEME_PREFERENCES[nextIndex];
}

export function resolveSystemTheme(): ResolvedTheme {
  if (typeof window === "undefined" || typeof window.matchMedia !== "function") {
    return "light";
  }

  return window.matchMedia(THEME_MEDIA_QUERY).matches ? "dark" : "light";
}

export function resolveThemePreference(preference: ThemePreference): ResolvedTheme {
  if (preference === "system") {
    return resolveSystemTheme();
  }

  return preference;
}

export function readStoredThemePreference(): ThemePreference {
  if (!canUseStorage()) {
    return "system";
  }

  try {
    return normalizeThemePreference(window.localStorage.getItem(THEME_STORAGE_KEY));
  } catch {
    return "system";
  }
}

export function writeStoredThemePreference(preference: ThemePreference) {
  if (!canUseStorage()) {
    return;
  }

  try {
    window.localStorage.setItem(THEME_STORAGE_KEY, preference);
  } catch {
    // Ignore storage failures and keep the current document theme.
  }
}

export function applyThemePreference(
  preference: ThemePreference,
  root = canUseDOM() ? document.documentElement : null,
) {
  const resolvedTheme = resolveThemePreference(preference);

  if (!root) {
    return resolvedTheme;
  }

  root.setAttribute(THEME_PREFERENCE_ATTRIBUTE, preference);
  root.setAttribute(THEME_ATTRIBUTE, resolvedTheme);
  root.style.colorScheme = resolvedTheme;

  return resolvedTheme;
}

export function createThemeBootstrapScript() {
  return `(() => {
		const storageKey = ${JSON.stringify(THEME_STORAGE_KEY)};
		const themeAttribute = ${JSON.stringify(THEME_ATTRIBUTE)};
		const preferenceAttribute = ${JSON.stringify(THEME_PREFERENCE_ATTRIBUTE)};
		const darkQuery = ${JSON.stringify(THEME_MEDIA_QUERY)};
		const allowed = ${JSON.stringify(THEME_PREFERENCES)};
		const normalize = (value) => allowed.includes(value) ? value : 'system';
		const resolve = (preference) => {
			if (preference !== 'system') {
				return preference;
			}

			return window.matchMedia?.(darkQuery).matches ? 'dark' : 'light';
		};

		let preference = 'system';

		try {
			preference = normalize(window.localStorage.getItem(storageKey));
		} catch {
			preference = 'system';
		}

		const resolvedTheme = resolve(preference);
		const root = document.documentElement;

		root.setAttribute(preferenceAttribute, preference);
		root.setAttribute(themeAttribute, resolvedTheme);
		root.style.colorScheme = resolvedTheme;
	})();`;
}
