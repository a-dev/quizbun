import { useCallback, useEffect, useRef, useState } from "react";

interface SpeakOptions {
  /**
   * The voice to speak with. Setting it explicitly is what keeps the engine from
   * falling back to a basic default — a bare `lang` lets it pick any matching
   * voice. The voice's own `lang` is applied to the utterance to match.
   */
  voice?: SpeechSynthesisVoice;
}

interface UseSpeech {
  /**
   * Whether the browser exposes the Web Speech synthesis API. Resolved only
   * after mount (see below), so it is `false` on the server and during the first
   * client render.
   */
  supported: boolean;
  /** True while an utterance started by this hook is being spoken. */
  speaking: boolean;
  /** Speak `text` with the local engine, replacing anything already playing. */
  speak: (text: string, options?: SpeakOptions) => void;
  /** Stop the current utterance immediately. */
  stop: () => void;
}

// Chrome silently stops synthesis after ~15s of speech; a periodic pause/resume
// keeps its queue alive. Harmless elsewhere — once a shorter utterance finishes,
// `speaking` is false and the guard inside the interval tears it down. See
// https://issues.chromium.org/issues/40416335 (crbug.com/679437).
const KEEP_ALIVE_MS = 10_000;

/**
 * Thin React wrapper over `window.speechSynthesis` (the synthesis half of the
 * Web Speech API). It drives the device's *local* text-to-speech engine — on
 * macOS the same voices as System Settings -> Spoken Content — so it needs no
 * backend, which suits Quizbun's static, no-network model.
 *
 * `speechSynthesis` is a single global queue shared by every component on the
 * page, so this hook tags the utterance it owns and ignores `end`/`error`
 * events that belong to one it has already replaced or cancelled. Only one
 * utterance plays at a time: starting a new one cancels the rest.
 */
export function useSpeech(): UseSpeech {
  // Resolved after mount only. `speechSynthesis` is a browser global, so during
  // Astro's SSR — and the first hydration render, to stay in lockstep with the
  // server output — we report `false` and render nothing, avoiding a mismatch.
  const [supported, setSupported] = useState(false);
  const [speaking, setSpeaking] = useState(false);
  const utteranceRef = useRef<SpeechSynthesisUtterance | null>(null);
  const keepAliveRef = useRef<ReturnType<typeof setInterval> | undefined>(undefined);

  useEffect(() => {
    setSupported("speechSynthesis" in window);
  }, []);

  const reset = useCallback(() => {
    clearInterval(keepAliveRef.current);
    keepAliveRef.current = undefined;
    utteranceRef.current = null;
    setSpeaking(false);
  }, []);

  const stop = useCallback(() => {
    reset();
    // Global: also clears anything another card queued. `cancel()` does not fire
    // `end`/`error` reliably across browsers, so `reset()` updates state itself.
    window.speechSynthesis.cancel();
  }, [reset]);

  const speak = useCallback(
    (text: string, options?: SpeakOptions) => {
      if (text.trim() === "") return;
      // Only one explanation reads at a time; drop whatever is playing/queued.
      window.speechSynthesis.cancel();

      const utterance = new SpeechSynthesisUtterance(text);
      if (options?.voice) {
        utterance.voice = options.voice;
        utterance.lang = options.voice.lang;
      }

      const finish = () => {
        // Ignore stale events from an utterance we have already superseded.
        if (utteranceRef.current === utterance) reset();
      };
      utterance.onend = finish;
      utterance.onerror = finish;

      utteranceRef.current = utterance;
      setSpeaking(true);
      window.speechSynthesis.speak(utterance);

      keepAliveRef.current = setInterval(() => {
        if (!window.speechSynthesis.speaking) {
          clearInterval(keepAliveRef.current);
          keepAliveRef.current = undefined;
          return;
        }
        window.speechSynthesis.pause();
        window.speechSynthesis.resume();
      }, KEEP_ALIVE_MS);
    },
    [reset],
  );

  // If the card unmounts mid-utterance (page change, exit Run), stop talking.
  useEffect(() => {
    return () => {
      clearInterval(keepAliveRef.current);
      if (utteranceRef.current) window.speechSynthesis.cancel();
    };
  }, []);

  return { supported, speaking, speak, stop };
}
