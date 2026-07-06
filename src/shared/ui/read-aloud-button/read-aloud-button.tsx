import { Square, Volume2 } from "lucide-react";

import { Button } from "@/shared/ui/button";

import { useSpeech } from "./use-speech";

interface ReadAloudButtonProps {
  /**
   * Plain text to be spoken. Strip Markdown/HTML before passing it in (e.g. via
   * `renderMarkdownFieldText`) — the engine would otherwise read the markup.
   */
  text: string;
  /**
   * The voice to read with. When absent, the control renders nothing — read-aloud
   * is opt-in: it only appears once the user has picked a voice in the footer.
   */
  voice: SpeechSynthesisVoice | null | undefined;
  /** Accessible label for the idle (play) state. */
  label?: string;
  className?: string;
}

/**
 * Icon toggle that reads `text` aloud with the chosen local voice and stops on a
 * second press. Renders nothing without a voice (the opt-in gate) or where speech
 * synthesis is unavailable (the server, browsers without the API), so callers can
 * drop it in unconditionally — it is purely additive.
 */
export function ReadAloudButton({
  text,
  voice,
  label = "Read aloud",
  className,
}: ReadAloudButtonProps) {
  const { supported, speaking, speak, stop } = useSpeech();

  if (!supported || !voice) return null;

  const actionLabel = speaking ? "Stop reading" : label;

  return (
    <Button
      type="button"
      variant="icon"
      size="icon-xs"
      aria-label={actionLabel}
      title={actionLabel}
      onClick={() => (speaking ? stop() : speak(text, { voice }))}
      className={className}
    >
      {speaking ? <Square size="16" aria-hidden /> : <Volume2 size="16" aria-hidden />}
    </Button>
  );
}
