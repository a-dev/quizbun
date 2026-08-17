import type { Page } from "@playwright/test";

import type { Quiz } from "../../src/shared/lib/quiz";

// The hybrid's fast path: write a quiz straight into IndexedDB instead of
// driving the import UI. Mirrors the storage contract in
// src/shared/lib/storage/{db,types}.ts — if the envelope shape changes, this is
// the single place to update.
const DB_NAME = "quizbun";
const QUIZZES_STORE = "quizzes";
const RUNS_STORE = "runs";

/**
 * Seed a Library quiz directly into IndexedDB, skipping `/import/`.
 *
 * Precondition: the app must have already opened the DB on this page (e.g. after
 * `page.goto("/library/")`), so its object stores and migrations exist. This
 * only `put`s a row — it never creates stores. Reload after seeding so the
 * Library list re-reads the store.
 */
export async function seedQuiz(page: Page, quiz: Quiz): Promise<void> {
  await page.evaluate(
    async ({ dbName, storeName, envelope }) => {
      const db = await new Promise<IDBDatabase>((resolve, reject) => {
        const request = indexedDB.open(dbName);
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
      });

      try {
        await new Promise<void>((resolve, reject) => {
          const transaction = db.transaction(storeName, "readwrite");
          transaction.objectStore(storeName).put(envelope);
          transaction.oncomplete = () => resolve();
          transaction.onerror = () => reject(transaction.error);
        });
      } finally {
        db.close();
      }
    },
    {
      dbName: DB_NAME,
      storeName: QUIZZES_STORE,
      envelope: { quiz, importedAt: Date.now() },
    },
  );
}

/**
 * Seed a Catalog Run directly into IndexedDB — Progress on a public quiz, with
 * nothing in the Library. Same precondition as `seedQuiz`: the app must already
 * have opened the DB on this page.
 */
export async function seedCatalogRun(page: Page, quizId = "seeded-catalog-run"): Promise<void> {
  await page.evaluate(
    async ({ dbName, storeName, run }) => {
      const db = await new Promise<IDBDatabase>((resolve, reject) => {
        const request = indexedDB.open(dbName);
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
      });

      try {
        await new Promise<void>((resolve, reject) => {
          const transaction = db.transaction(storeName, "readwrite");
          transaction.objectStore(storeName).put(run);
          transaction.oncomplete = () => resolve();
          transaction.onerror = () => reject(transaction.error);
        });
      } finally {
        db.close();
      }
    },
    {
      dbName: DB_NAME,
      storeName: RUNS_STORE,
      run: {
        key: `catalog:${quizId}`,
        source: "catalog",
        quizId,
        answers: {},
        startedAt: Date.now(),
        updatedAt: Date.now(),
      },
    },
  );
}
