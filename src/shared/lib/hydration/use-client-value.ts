import { useSyncExternalStore } from "react";

/**
 * The value never changes once the client has taken over, so there is nothing
 * to subscribe to and the store never notifies.
 */
const subscribeToNothing = () => () => {};

/**
 * Reads a value that only exists in a browser without breaking hydration:
 * `document.body` to portal into, `"speechSynthesis" in window`, or simply
 * whether the client has taken over yet.
 *
 * Astro prerenders these islands at build time, so the first client render has
 * to produce exactly what the build produced. Reading the browser during
 * render breaks that twice over: the server has no `window`, and a mismatch
 * makes React discard the server markup and re-render the tree from scratch.
 * `serverValue` covers SSR and that first render, then `readClientValue()`
 * takes over.
 *
 * `useState(false)` plus an effect that flips it on mount does the same job,
 * but the flip lands in a passive effect after the first paint, and the effect
 * exists only to report which environment the code is running in.
 * `useSyncExternalStore` takes the server snapshot as an argument, so React
 * swaps in the client value as part of hydration instead. `use-player-route.ts`
 * and `voice-store.ts` read the URL and the voice list through the same API.
 *
 * `readClientValue` must return an `Object.is`-equal value on every call or
 * React re-renders forever. A boolean or a string is safe; a fresh object or
 * array is not.
 */
export function useClientValue<T>(readClientValue: () => T, serverValue: T): T {
  return useSyncExternalStore(subscribeToNothing, readClientValue, () => serverValue);
}
