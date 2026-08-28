export const THEME_STORAGE_KEY = "quizbun-theme";
export const THEME_ATTRIBUTE = "data-theme";
export const THEME_PREFERENCE_ATTRIBUTE = "data-theme-preference";
export const THEME_MEDIA_QUERY = "(prefers-color-scheme: dark)";

export const RESOLVED_THEMES = ["light", "dark"] as const;
export const THEME_PREFERENCES = [...RESOLVED_THEMES, "system"] as const;

export type ResolvedTheme = (typeof RESOLVED_THEMES)[number];
export type ThemePreference = (typeof THEME_PREFERENCES)[number];

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

/**
 * The two-state toggle over the three-state model: flip whatever is on screen,
 * and fall back to "system" whenever the target already matches the system
 * theme. That way an explicit preference equal to the system theme is never
 * stored -- which would silently turn a temporary adjustment into a permanent
 * pin -- and every toggle stays reversible in one click.
 *
 * Takes `systemTheme` rather than reading `matchMedia` so the rule stays pure:
 * a stored preference is only ever re-evaluated when the user clicks.
 */
export function getToggledThemePreference(
  preference: ThemePreference,
  systemTheme: ResolvedTheme,
): ThemePreference {
  const visibleTheme = preference === "system" ? systemTheme : preference;
  const nextTheme: ResolvedTheme = visibleTheme === "dark" ? "light" : "dark";

  return nextTheme === systemTheme ? "system" : nextTheme;
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
    // "system" is the absence of a stored value, not a value of its own.
    if (preference === "system") {
      window.localStorage.removeItem(THEME_STORAGE_KEY);
    } else {
      window.localStorage.setItem(THEME_STORAGE_KEY, preference);
    }
  } catch {
    // Ignore storage failures and keep the current document theme.
  }
}

export const COLOR_SCHEME_META_SELECTOR = 'meta[name="color-scheme"]';

/**
 * The `<meta name="color-scheme">` value for a preference: the pinned scheme,
 * or both schemes when the user follows the system. Keeping the meta tag in
 * step with the pin is what the toggle needs to reach browser-painted surfaces
 * that read the document metadata rather than the cascade.
 */
export function metaColorSchemeFor(preference: ThemePreference): string {
  return preference === "system" ? "light dark" : preference;
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

  const meta = root.ownerDocument.querySelector<HTMLMetaElement>(COLOR_SCHEME_META_SELECTOR);

  if (meta !== null) {
    meta.content = metaColorSchemeFor(preference);
  }

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

		const meta = document.querySelector(${JSON.stringify(COLOR_SCHEME_META_SELECTOR)});

		if (meta) {
			meta.content = preference === 'system' ? 'light dark' : preference;
		}
	})();`;
}
