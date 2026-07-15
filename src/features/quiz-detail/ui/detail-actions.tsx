import { memo } from "react";

import type { RunStatus } from "@/shared/lib/storage";
import { Button } from "@/shared/ui/button";

import type { PlayerView } from "../model/player-route";

import styles from "./detail-actions.module.css";

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
