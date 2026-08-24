import { lazy, Suspense } from "react";

import { TopLineLoader } from "@/shared/ui/loader";

import { PlayerFrame } from "./player-frame";
import type { PlayerProps } from "./player-runtime";

const PlayerRuntime = lazy(async () => ({
  default: (await import("./player-runtime")).PlayerRuntime,
}));

/**
 * Code-split boundary for the Run player. Detail and player share one route
 * (SPEC.md §4), so the detail surface statically imports whatever the player
 * imports; without this split every visitor reading a quiz description
 * downloads the questions view, the summary, and their answer controls too.
 * Only this shell and `PlayerFrame` stay eager — the rest arrives when
 * someone actually enters.
 *
 * The fallback is the same frame + loader pair `PlayerRuntime` shows while it
 * reads the Run: the quiz title (and the `view-transition-name` on it) has to
 * exist in the first frame after the swap for the detail → player morph to
 * connect. The two loading states are indistinguishable, so a cold chunk only
 * lengthens the wait the Run read already produces.
 */
export function Player(props: PlayerProps) {
  return (
    <Suspense
      fallback={
        <PlayerFrame quiz={props.quiz} onExit={props.onExit}>
          <TopLineLoader />
        </PlayerFrame>
      }
    >
      <PlayerRuntime {...props} />
    </Suspense>
  );
}
