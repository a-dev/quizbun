/**
 * Normalize a thrown value to a display string. A `catch` binding is typed
 * `unknown`, so guard before reading `.message`; anything that isn't an `Error`
 * (strings, rejected non-`Error` values) falls back to `String()`.
 */
export function messageFromError(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}
