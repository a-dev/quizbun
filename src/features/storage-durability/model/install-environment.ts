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
