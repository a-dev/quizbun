import { useId, useMemo } from "react";

import { useVoicePreference } from "@/shared/lib/speech";
import { Select } from "@/shared/ui/select";

import styles from "./voice-picker.module.css";

// Sentinel for "no voice" — Base UI's Select needs a concrete value, and an
// empty string clashes with its placeholder handling, so use a named token.
const OFF = "off";

/**
 * Footer control that opts the reader into read-aloud. Choosing a voice persists
 * it (cross-island store) and reveals the per-Explanation read-aloud button;
 * "Off" hides it again. Renders nothing when the browser exposes no voices, so
 * the footer stays clean where speech synthesis is unavailable.
 */
export function VoicePicker() {
  const { voices, selectedVoiceUri, selectVoice } = useVoicePreference();
  const labelId = useId();

  const options = useMemo(() => {
    // English-only on purpose: Quizbun has no multi-language support yet — the
    // Standard carries a single `language` and the public Catalog is English —
    // so a non-English voice would mispronounce every Explanation. Matching the
    // BCP-47 primary subtag `en` covers all English locales (en-US, en-GB,
    // en-AU, …) without hardcoding regions. Revisit when the catalog gains other
    // languages: ideally pick the voice from the quiz's own `language`.
    const english = voices.filter((voice) => voice.lang.toLowerCase().split("-")[0] === "en");
    // Prefer on-device voices — this feature is about the *local* engine, and
    // network voices would send the Explanation text to a third party. Fall back
    // to the full English set only if a browser exposes nothing local.
    const local = english.filter((voice) => voice.localService);
    const list = local.length > 0 ? local : english;
    return [...list].sort((a, b) => a.lang.localeCompare(b.lang) || a.name.localeCompare(b.name));
  }, [voices]);

  if (options.length === 0) return null;

  const items = [
    { value: OFF, label: "Off" },
    ...options.map((voice) => ({ value: voice.voiceURI, label: `${voice.name} (${voice.lang})` })),
  ];

  return (
    <div className={styles.root} role="group" aria-labelledby={labelId}>
      <span id={labelId} className={styles.label}>
        Read aloud
      </span>
      <Select
        size="s"
        items={items}
        value={selectedVoiceUri ?? OFF}
        onValueChange={(value) => selectVoice(value === OFF ? null : value)}
        scrollArrows
      >
        {items.map((item) => (
          <Select.Item key={item.value} value={item.value}>
            {item.label}
          </Select.Item>
        ))}
      </Select>
    </div>
  );
}
