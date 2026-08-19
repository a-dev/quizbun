// No usage/quota wrapper here on purpose. `estimate()` reports the whole origin
// (IndexedDB, localStorage, caches, the worker script) and browsers pad parts of
// it, so the figure can never be presented as "your quizzes" — see the plan's T3.

function getStorageManager(): StorageManager | undefined {
  try {
    return typeof navigator === "undefined" ? undefined : navigator.storage;
  } catch {
    return undefined;
  }
}

/**
 * Whether this engine can both report *and* request persistence.
 *
 * `StorageManager` is secure-context-only and absent in some private modes, so
 * callers need a way to render nothing at all. Both methods are required
 * together on purpose: with only `persisted()` the UI would offer an action
 * that can never succeed, and a denial and a missing method are
 * indistinguishable to `requestStoragePersistence`.
 */
export function isStorageApiAvailable(): boolean {
  try {
    const storage = getStorageManager();

    return typeof storage?.persisted === "function" && typeof storage?.persist === "function";
  } catch {
    return false;
  }
}

export async function isStoragePersisted(): Promise<boolean> {
  try {
    const storage = getStorageManager();

    return typeof storage?.persisted === "function" ? await storage.persisted() : false;
  } catch {
    return false;
  }
}

export async function requestStoragePersistence(): Promise<boolean> {
  try {
    const storage = getStorageManager();

    return typeof storage?.persist === "function" ? await storage.persist() : false;
  } catch {
    return false;
  }
}
