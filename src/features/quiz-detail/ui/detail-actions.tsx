import { memo } from "react";

import type { RunStatus } from "@/shared/lib/storage";
import { Button, LinkAsButton } from "@/shared/ui/button";

import { shouldEnterInPlace } from "../lib/in-place-navigation";
import type { PlayerView } from "../model/player-route";

import styles from "./detail-actions.module.css";

interface DetailActionsFallbackProps {
  startHref: string;
  onStart: () => void;
}

/**
 * The SSR and first-render stand-in for `DetailActions`, whose labels need a
 * Run status that only IndexedDB can supply. "Start" is the honest default:
 * correct for every first-time visitor, and it puts the primary action in the
 * static HTML instead of behind hydration. A real `href`, so it works with
 * JavaScript disabled — following it loads the same page in "run" mode.
 *
 * Sized to match the no-Run "Start" below, so the common case — and every
 * crawler — sees no shift when the real actions replace this. A visitor with a
 * saved Run briefly reads "Start" before "Continue"; that swap already changes
 * the row (Reset appears), and the top-line loader marks it as still resolving.
 */
export function DetailActionsFallback({ startHref, onStart }: DetailActionsFallbackProps) {
  return (
    <div className={styles.root}>
      <LinkAsButton
        size="l"
        variant="primary"
        href={startHref}
        // Same page under a query param — nothing new to index (PRD §5).
        rel="nofollow"
        onClick={(event) => {
          if (!shouldEnterInPlace(event)) return;

          event.preventDefault();
          onStart();
        }}
      >
        Start
      </LinkAsButton>
    </div>
  );
}

interface DetailActionsProps {
  runStatus: RunStatus;
  onPlay: (view: PlayerView) => void;
  onRetake: () => void;
  onResetRequest: () => void;
}

/**
 * The state-aware primary action (idea.md): a single button whose label and
 * target view track the Run — Start (no Run), Continue (in progress), or See
 * summary (finished). Retake and Reset appear only once a Run exists.
 *
 * `memo`-wrapped with stable callbacks from the parent, so it re-renders only
 * when `runStatus` changes, not on dialog toggles or header-only updates.
 */
function DetailActionsComponent({
  runStatus,
  onPlay,
  onRetake,
  onResetRequest,
}: DetailActionsProps) {
  if (runStatus.kind === "none") {
    return (
      <div className={styles.root}>
        <Button size="l" variant="primary" onClick={() => onPlay("questions")}>
          Start
        </Button>
      </div>
    );
  }

  const finished = runStatus.kind === "finished";

  return (
    <div className={styles.root}>
      <Button size="m" variant="primary" onClick={() => onPlay(finished ? "summary" : "questions")}>
        {finished ? "See summary" : "Continue"}
      </Button>
      {finished && (
        <Button size="m" variant="secondary" onClick={onRetake}>
          Retake
        </Button>
      )}
      <Button size="m" variant="destructive" onClick={onResetRequest}>
        Reset progress
      </Button>
    </div>
  );
}

export const DetailActions = memo(DetailActionsComponent);
