import { describe, expect, test } from "vitest";

import { holdViewTransitionUntil, settleViewTransitionHolds } from "./transition-hold";

describe("view transition holds", () => {
  test("settles immediately when no holds are open", async () => {
    const before = performance.now();

    await settleViewTransitionHolds(1_000);

    expect(performance.now() - before).toBeLessThan(50);
  });

  test("waits for an open hold to resolve", async () => {
    let release!: () => void;
    holdViewTransitionUntil(
      new Promise<void>((resolve) => {
        release = resolve;
      }),
    );

    let settled = false;
    const settling = settleViewTransitionHolds(1_000).then(() => {
      settled = true;
    });

    // Give the settle promise a chance to (incorrectly) resolve early.
    await new Promise((resolve) => setTimeout(resolve, 20));
    expect(settled).toBe(false);

    release();
    await settling;
    expect(settled).toBe(true);
  });

  test("a rejected hold releases the capture instead of blocking it", async () => {
    holdViewTransitionUntil(Promise.reject(new Error("load failed")));

    await expect(settleViewTransitionHolds(1_000)).resolves.toBeUndefined();
  });

  // Deliberately last: the never-settling hold stays in the module-level
  // registry (nothing ever removes it), so any test added after this one
  // would inherit a permanently open hold.
  test("gives up after the timeout when a hold never settles", async () => {
    holdViewTransitionUntil(new Promise(() => {}));

    const before = performance.now();
    await settleViewTransitionHolds(30);

    const elapsed = performance.now() - before;
    expect(elapsed).toBeGreaterThanOrEqual(25);
    expect(elapsed).toBeLessThan(500);
  });
});
