import { afterEach, describe, expect, test, vi } from "vitest";

import {
  isStorageApiAvailable,
  isStoragePersisted,
  requestStoragePersistence,
} from "./persistence";

function stubStorage(storage: Partial<StorageManager> | undefined) {
  vi.stubGlobal("navigator", storage === undefined ? {} : { storage });
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("storage persistence", () => {
  test("reports and grants persistence", async () => {
    stubStorage({
      persisted: vi.fn<StorageManager["persisted"]>().mockResolvedValue(true),
      persist: vi.fn<StorageManager["persist"]>().mockResolvedValue(true),
    });

    await expect(isStoragePersisted()).resolves.toBe(true);
    await expect(requestStoragePersistence()).resolves.toBe(true);
  });

  test("returns false when persistence is denied", async () => {
    stubStorage({
      persisted: vi.fn<StorageManager["persisted"]>().mockResolvedValue(false),
      persist: vi.fn<StorageManager["persist"]>().mockResolvedValue(false),
    });

    await expect(isStoragePersisted()).resolves.toBe(false);
    await expect(requestStoragePersistence()).resolves.toBe(false);
  });

  test("degrades when the Storage API is absent", async () => {
    stubStorage(undefined);

    await expect(isStoragePersisted()).resolves.toBe(false);
    await expect(requestStoragePersistence()).resolves.toBe(false);
  });

  test("degrades when the Storage API throws", async () => {
    stubStorage({
      persisted: vi.fn<StorageManager["persisted"]>().mockRejectedValue(new Error("denied")),
      persist: vi.fn<StorageManager["persist"]>().mockRejectedValue(new Error("denied")),
    });

    await expect(isStoragePersisted()).resolves.toBe(false);
    await expect(requestStoragePersistence()).resolves.toBe(false);
  });
});

describe("storage API availability", () => {
  test("is available when persistence can be both read and requested", () => {
    stubStorage({
      persisted: vi.fn<StorageManager["persisted"]>(),
      persist: vi.fn<StorageManager["persist"]>(),
    });

    expect(isStorageApiAvailable()).toBe(true);
  });

  test("is unavailable when the Storage API is absent", () => {
    stubStorage(undefined);

    expect(isStorageApiAvailable()).toBe(false);
  });

  // A partial StorageManager would otherwise leave the durability UI offering a
  // "Protect storage" action that can never succeed.
  test("is unavailable when persist() is missing", () => {
    stubStorage({
      persisted: vi.fn<StorageManager["persisted"]>(),
      estimate: vi.fn<StorageManager["estimate"]>(),
    });

    expect(isStorageApiAvailable()).toBe(false);
  });

  test("is unavailable when persisted() is missing", () => {
    stubStorage({ persist: vi.fn<StorageManager["persist"]>() });

    expect(isStorageApiAvailable()).toBe(false);
  });
});
