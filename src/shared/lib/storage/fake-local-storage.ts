/**
 * An in-memory `Storage` for the unit lane, which runs in Node without a DOM.
 * Assign it to `globalThis.localStorage` in `beforeEach` so each test starts
 * from an empty store.
 */
export function fakeLocalStorage(): Storage {
  const entries = new Map<string, string>();

  return {
    getItem: (key) => entries.get(key) ?? null,
    setItem: (key, value) => void entries.set(key, value),
    removeItem: (key) => void entries.delete(key),
    clear: () => entries.clear(),
    key: (index) => [...entries.keys()][index] ?? null,
    get length() {
      return entries.size;
    },
  };
}
