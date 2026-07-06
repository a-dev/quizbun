import { getVoicePreference, setVoicePreference } from "@/shared/lib/storage";

/**
 * Cross-island store for the read-aloud voice. The footer's voice picker and the
 * player's read-aloud button live in *separate* Astro islands that share no
 * React tree, so both subscribe to this module-level store through
 * `useSyncExternalStore`. The source of truth is two browser globals:
 * localStorage (the persisted choice) and `speechSynthesis.getVoices()` (the
 * live voice list). A custom window event bridges same-document updates — the
 * native `storage` event only fires in *other* tabs, so the tab that makes the
 * change would otherwise never notify its own subscribers.
 */

const VOICE_PREFERENCE_EVENT = "quizbun:voice-preference";

function isSupported(): boolean {
  return typeof window !== "undefined" && "speechSynthesis" in window;
}

// --- Available voices ------------------------------------------------------

// `getVoices()` returns a fresh array on every call; handing that straight to
// `useSyncExternalStore` would loop forever (a new reference each read). So we
// cache the list and only swap the reference when its contents actually change.
// `NO_VOICES` is a stable empty reference for the unsupported/not-yet-loaded state.
const NO_VOICES: SpeechSynthesisVoice[] = [];
let cachedVoices: SpeechSynthesisVoice[] = NO_VOICES;

function voicesEqual(a: SpeechSynthesisVoice[], b: SpeechSynthesisVoice[]): boolean {
  return a.length === b.length && a.every((voice, index) => voice.voiceURI === b[index]?.voiceURI);
}

function refreshVoices(): void {
  if (!isSupported()) return;
  const next = window.speechSynthesis.getVoices();
  if (!voicesEqual(next, cachedVoices)) {
    cachedVoices = next.length === 0 ? NO_VOICES : next;
  }
}

export function getVoicesSnapshot(): SpeechSynthesisVoice[] {
  return cachedVoices;
}

export function getServerVoicesSnapshot(): SpeechSynthesisVoice[] {
  return NO_VOICES;
}

// --- Selected voice URI ----------------------------------------------------

export function getSelectedVoiceUriSnapshot(): string | null {
  return getVoicePreference();
}

export function getServerSelectedVoiceUriSnapshot(): string | null {
  return null;
}

export function setSelectedVoiceUri(voiceUri: string | null): void {
  setVoicePreference(voiceUri);
  // Notify this document's subscribers (e.g. the player's read-aloud button);
  // the `storage` event covers other tabs, this covers the current one.
  window.dispatchEvent(new Event(VOICE_PREFERENCE_EVENT));
}

// --- Subscription ----------------------------------------------------------

export function subscribe(onStoreChange: () => void): () => void {
  if (!isSupported()) return () => {};

  const onVoicesChanged = () => {
    refreshVoices();
    onStoreChange();
  };

  // Prime the cache once: some engines populate voices synchronously and never
  // fire `voiceschanged`, so the event alone can't be relied on.
  refreshVoices();

  window.speechSynthesis.addEventListener("voiceschanged", onVoicesChanged);
  window.addEventListener(VOICE_PREFERENCE_EVENT, onStoreChange);
  window.addEventListener("storage", onStoreChange);

  return () => {
    window.speechSynthesis.removeEventListener("voiceschanged", onVoicesChanged);
    window.removeEventListener(VOICE_PREFERENCE_EVENT, onStoreChange);
    window.removeEventListener("storage", onStoreChange);
  };
}
