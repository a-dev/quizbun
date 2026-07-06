import { useRef, useState } from "react";

import { Button } from "@/shared/ui/button";

import styles from "./copy-prompt-button.module.css";

type CopyState = "idle" | "copied" | "failed";

const CONFIRMATION_MS = 3000;

/**
 * The one piece of interactivity in the docs section (T3.1): copies the prompt
 * source text — passed in at build time, never scraped from the rendered HTML —
 * with a visible, screen-reader-announced confirmation that auto-clears.
 */
export function CopyPromptButton({ promptText }: { promptText: string }) {
  const [copyState, setCopyState] = useState<CopyState>("idle");
  const resetTimerRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  const copyPrompt = async () => {
    // Cancel a pending reset so rapid re-copies keep the confirmation visible
    // for the full window instead of clearing early from the previous click.
    clearTimeout(resetTimerRef.current);

    try {
      await navigator.clipboard.writeText(promptText);
      setCopyState("copied");
      resetTimerRef.current = setTimeout(() => setCopyState("idle"), CONFIRMATION_MS);
    } catch {
      setCopyState("failed");
    }
  };

  return (
    <div className={styles.root}>
      <Button size="l" onClick={copyPrompt}>
        Copy prompt
      </Button>{" "}
      <span role="status" className={styles.status}>
        {copyState === "copied" && "Copied to clipboard"}
        {copyState === "failed" &&
          "Copying failed — select the prompt text below and copy it manually"}
      </span>
    </div>
  );
}
