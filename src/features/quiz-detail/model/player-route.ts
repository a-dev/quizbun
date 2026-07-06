import type { PlayerUrlState } from "@/shared/lib/routing";

/**
 * Detail and player share one route (PRD §5): activating the primary action
 * swaps the player in as in-page state instead of navigating. `Surface` is
 * which of the two the detail feature currently shows. It is always *derived*
 * from the URL state, never stored separately — the URL is the single source
 * of truth, so the surface and the address can never drift apart.
 */
export type Surface = "detail" | "player";

/** The player's own two views, requested through the route URL. */
export type PlayerView = "questions" | "summary";

/** "run" and "summary" are both player surfaces; only "detail" stays on detail. */
export function surfaceFromState(state: PlayerUrlState): Surface {
  return state.mode === "detail" ? "detail" : "player";
}

/** A finished Run opens straight to the summary; everything else, the questions. */
export function playerViewFromState(state: PlayerUrlState): PlayerView {
  return state.mode === "summary" ? "summary" : "questions";
}
