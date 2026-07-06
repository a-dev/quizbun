import { useCallback, useSyncExternalStore } from "react";

import {
  getSelectedVoiceUriSnapshot,
  getServerSelectedVoiceUriSnapshot,
  getServerVoicesSnapshot,
  getVoicesSnapshot,
  setSelectedVoiceUri,
  subscribe,
} from "./voice-store";

/** The voices the local engine exposes (empty until they load, or if unsupported). */
export function useSpeechVoices(): SpeechSynthesisVoice[] {
  return useSyncExternalStore(subscribe, getVoicesSnapshot, getServerVoicesSnapshot);
}

function useSelectedVoiceUri(): string | null {
  return useSyncExternalStore(
    subscribe,
    getSelectedVoiceUriSnapshot,
    getServerSelectedVoiceUriSnapshot,
  );
}

/**
 * The chosen voice resolved to a live `SpeechSynthesisVoice`, or null when
 * nothing is selected or the stored voice isn't available in this browser.
 * Read-aloud controls render only when this is non-null — that is the opt-in.
 */
export function useSelectedVoice(): SpeechSynthesisVoice | null {
  const voices = useSpeechVoices();
  const selectedVoiceUri = useSelectedVoiceUri();
  if (selectedVoiceUri === null) return null;
  return voices.find((voice) => voice.voiceURI === selectedVoiceUri) ?? null;
}

interface VoicePreference {
  voices: SpeechSynthesisVoice[];
  selectedVoiceUri: string | null;
  selectVoice: (voiceUri: string | null) => void;
}

/** Picker-facing view: the available voices, the current choice, and a setter. */
export function useVoicePreference(): VoicePreference {
  const voices = useSpeechVoices();
  const selectedVoiceUri = useSelectedVoiceUri();
  const selectVoice = useCallback((voiceUri: string | null) => setSelectedVoiceUri(voiceUri), []);
  return { voices, selectedVoiceUri, selectVoice };
}
