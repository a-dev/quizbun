import { flushSync } from "react-dom";

import { settleViewTransitionHolds } from "./transition-hold";

/**
 * The longest the new-state capture waits for content that loads async
 * (see `transition-hold.ts`). Past this, the transition proceeds with
 * whatever is rendered — the pre-hold behavior.
 */
const HOLD_TIMEOUT_MS = 350;

/**
 * Same-document view transition wrapper for React state swaps (detail ↔
 * player). Progressive enhancement: without browser support — or when the
 * user prefers reduced motion — the update applies directly, unanimated.
 * Inside a transition the update is flushed synchronously so the browser's
 * "new" snapshot captures the post-update DOM, not a pending render; the
 * capture then waits (bounded) for any view-transition holds the newly
 * mounted content registered, so the morph lands on real pixels rather
 * than a transient loading frame.
 */
export function withViewTransition(update: () => void): void {
  if (
    typeof document === "undefined" ||
    typeof document.startViewTransition !== "function" ||
    window.matchMedia("(prefers-reduced-motion: reduce)").matches
  ) {
    update();

    return;
  }

  document.startViewTransition(async () => {
    flushSync(update);
    await settleViewTransitionHolds(HOLD_TIMEOUT_MS);
  });
}
