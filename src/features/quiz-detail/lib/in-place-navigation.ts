import type { MouseEvent } from "react";

/**
 * Detail links to player surfaces are real `<a href>` elements so they stay
 * crawlable, copyable, and openable in a new tab. Only a plain left click is
 * intercepted for the in-place surface swap; cmd/ctrl/shift/alt-click and
 * anything already handled fall through to the browser.
 */
export function shouldEnterInPlace(event: MouseEvent<HTMLAnchorElement>): boolean {
  return (
    event.button === 0 &&
    !event.altKey &&
    !event.ctrlKey &&
    !event.metaKey &&
    !event.shiftKey &&
    !event.defaultPrevented
  );
}
