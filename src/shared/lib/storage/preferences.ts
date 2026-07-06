export const PAGE_SIZES = [1, 3, 5, 10] as const;

export type PageSize = (typeof PAGE_SIZES)[number];

export const DEFAULT_PAGE_SIZE: PageSize = 5;

// Page size is a global UI preference (not per quiz), so a single key suffices.
const PAGE_SIZE_KEY = "quizbun.page-size";

function isPageSize(value: number): value is PageSize {
  return (PAGE_SIZES as readonly number[]).includes(value);
}

/** Tolerant read: anything missing or invalid falls back to the default. */
export function getPageSize(): PageSize {
  try {
    const raw = localStorage.getItem(PAGE_SIZE_KEY);
    if (raw === null) return DEFAULT_PAGE_SIZE;

    const parsed = Number(raw);

    return isPageSize(parsed) ? parsed : DEFAULT_PAGE_SIZE;
  } catch {
    return DEFAULT_PAGE_SIZE;
  }
}

export function setPageSize(pageSize: PageSize): void {
  try {
    localStorage.setItem(PAGE_SIZE_KEY, String(pageSize));
  } catch {
    // Storage may be unavailable (private mode, quota); the preference simply doesn't persist.
  }
}

// The read-aloud voice, identified by its `voiceURI`. Absent means the user
// hasn't opted in, in which case no read-aloud controls are shown.
const VOICE_URI_KEY = "quizbun.voice-uri";

/** Tolerant read: missing or unreadable storage yields null (no voice chosen). */
export function getVoicePreference(): string | null {
  try {
    return localStorage.getItem(VOICE_URI_KEY);
  } catch {
    return null;
  }
}

export function setVoicePreference(voiceUri: string | null): void {
  try {
    if (voiceUri === null) {
      localStorage.removeItem(VOICE_URI_KEY);
    } else {
      localStorage.setItem(VOICE_URI_KEY, voiceUri);
    }
  } catch {
    // Storage may be unavailable (private mode, quota); the choice simply doesn't persist.
  }
}
