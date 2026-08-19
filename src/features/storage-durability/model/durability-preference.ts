/**
 * Whether anything was stored locally when the notice was dismissed.
 *
 * Dismissal is deliberately *not* a single permanent flag. The notice first
 * appears while nothing is stored, which is exactly when a user has nothing to
 * lose and is most likely to dismiss it — and the Safari↔home-screen isolation
 * warning ("quizzes and progress saved in Safari won't appear in the installed
 * app") only becomes true once there is data. A permanent flag would therefore
 * hide that warning from precisely the users it protects. So dismissing with an
 * empty browser silences only the install-first copy; the notice returns once
 * there is data, and dismissing it then is final.
 */
export type DurabilityDismissal = "nothing-stored" | "data-stored";

const DURABILITY_NOTICE_DISMISSED_KEY = "quizbun.durability-notice-dismissed";

const DISMISSALS: readonly DurabilityDismissal[] = ["nothing-stored", "data-stored"];

function isDurabilityDismissal(value: string): value is DurabilityDismissal {
  return (DISMISSALS as readonly string[]).includes(value);
}

/** Tolerant read: anything missing or unrecognized means "not dismissed". */
export function getDurabilityDismissal(): DurabilityDismissal | null {
  try {
    const raw = localStorage.getItem(DURABILITY_NOTICE_DISMISSED_KEY);

    return raw !== null && isDurabilityDismissal(raw) ? raw : null;
  } catch {
    return null;
  }
}

export function setDurabilityDismissal(dismissal: DurabilityDismissal): void {
  try {
    localStorage.setItem(DURABILITY_NOTICE_DISMISSED_KEY, dismissal);
  } catch {
    // Storage may be unavailable; dismissal remains effective for this render only.
  }
}

/**
 * A dismissal recorded with data present is final; one recorded on an empty
 * browser lapses as soon as there is something to lose.
 */
export function isDurabilityNoticeDismissed(
  dismissal: DurabilityDismissal | null,
  hasData: boolean,
): boolean {
  if (dismissal === null) return false;

  return dismissal === "data-stored" || !hasData;
}
