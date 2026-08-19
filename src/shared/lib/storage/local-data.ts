import { QUIZZES_STORE, requestToPromise, RUNS_STORE, withTransaction } from "./db";

/**
 * Whether this browser holds anything the user would lose if storage were
 * evicted: an imported Quiz, or saved Progress on any Quiz.
 *
 * Runs are counted deliberately, and they are why this spans both stores.
 * Finishing a public Catalog Quiz writes a Run to the same IndexedDB under the
 * `catalog:` namespace, at exactly the same risk as a Library import — so a user
 * who never imports anything still has something to protect, and asking "are
 * there Quizzes?" would answer the wrong question.
 */
export async function hasStoredData(): Promise<boolean> {
  return withTransaction([QUIZZES_STORE, RUNS_STORE], "readonly", async (transaction) => {
    const [quizCount, runCount] = await Promise.all([
      requestToPromise(transaction.objectStore(QUIZZES_STORE).count()),
      requestToPromise(transaction.objectStore(RUNS_STORE).count()),
    ]);

    return quizCount > 0 || runCount > 0;
  });
}
