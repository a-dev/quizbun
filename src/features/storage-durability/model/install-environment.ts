export interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>;
}

/**
 * How this browser can be installed, which decides what the notice may claim.
 * `"none"` matters: telling a user to use a menu their browser doesn't have
 * makes the whole notice look uninformed.
 */
export type InstallPath = "prompt" | "ios-safari" | "browser-menu" | "none";

type NavigatorWithStandalone = Navigator & { standalone?: boolean };

export function isStandaloneDisplay(): boolean {
  try {
    const mediaStandalone = window.matchMedia("(display-mode: standalone)").matches;
    const iosStandalone = Boolean((navigator as NavigatorWithStandalone).standalone);

    return mediaStandalone || iosStandalone;
  } catch {
    return false;
  }
}

export function isIosDevice(): boolean {
  try {
    return (
      /iPad|iPhone|iPod/i.test(navigator.userAgent) ||
      (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1)
    );
  } catch {
    return false;
  }
}

function isFirefox(): boolean {
  try {
    return /firefox|fxios/i.test(navigator.userAgent);
  } catch {
    return false;
  }
}

/**
 * `hasInstallPrompt` is a captured `beforeinstallprompt` — the only proof that
 * this browser will install on our button rather than through its own UI.
 */
export function resolveInstallPath(hasInstallPrompt: boolean): InstallPath {
  if (hasInstallPrompt) return "prompt";
  if (isIosDevice()) return "ios-safari";
  // Firefox dropped site-specific browsers entirely, so there is no menu to
  // point at. It is also the one engine where `persist()` raises a real
  // permission prompt, so "Protect storage" carries the whole notice there.
  if (isFirefox()) return "none";

  return "browser-menu";
}
