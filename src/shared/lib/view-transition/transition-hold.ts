/**
 * A same-document view transition captures its "new" state as soon as the DOM
 * update settles — but a surface that mounts in a loading state (the player
 * reading its Run from IndexedDB) would be captured mid-skeleton: the morph
 * animates into a near-empty frame and the real content pops in unanimated.
 *
 * A hold keeps that capture open: the mounting surface registers a promise,
 * and `withViewTransition` waits (bounded) for open holds to settle before
 * letting the browser snapshot. Without a running transition a hold is inert.
 */
const holds = new Set<Promise<void>>();

/** Keep a pending transition from capturing until `ready` settles (either way). */
export function holdViewTransitionUntil(ready: Promise<unknown>): void {
  const hold = ready.then(
    () => undefined,
    () => undefined,
  );

  holds.add(hold);
  void hold.finally(() => holds.delete(hold));
}

/** Resolves when every open hold settles, or after `timeoutMs` — whichever is first. */
export async function settleViewTransitionHolds(timeoutMs: number): Promise<void> {
  if (holds.size === 0) return;

  let timer: ReturnType<typeof setTimeout> | undefined;

  await Promise.race([
    Promise.all(holds),
    new Promise<void>((resolve) => {
      timer = setTimeout(resolve, timeoutMs);
    }),
  ]);

  clearTimeout(timer);
}
