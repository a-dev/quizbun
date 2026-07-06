const DB_NAME = "quizbun";

export const QUIZZES_STORE = "quizzes";
export const RUNS_STORE = "runs";

// One entry per schema version; migrations[n] upgrades the database to version n + 1.
// Append a new entry (never edit existing ones) when the stored shape changes.
// The versionchange transaction is passed so data migrations can read existing
// rows; request callbacks keep that transaction alive until they settle.
const migrations: ReadonlyArray<(db: IDBDatabase, transaction: IDBTransaction) => void> = [
  (db) => {
    db.createObjectStore(QUIZZES_STORE, { keyPath: "quiz.id" });
    db.createObjectStore(RUNS_STORE, { keyPath: "quizId" });
  },
  // M3: Runs move from `quizId` keys to namespaced `${source}:${quizId}` keys
  // so Catalog and Library Runs never collide. Existing Runs predate the
  // Catalog, so they all belong to the "library" namespace.
  (db, transaction) => {
    const getAllRequest = transaction.objectStore(RUNS_STORE).getAll();

    getAllRequest.onsuccess = () => {
      const legacyRuns = getAllRequest.result as Array<{ quizId: string }>;

      db.deleteObjectStore(RUNS_STORE);
      const runsStore = db.createObjectStore(RUNS_STORE, { keyPath: "key" });

      for (const legacyRun of legacyRuns) {
        runsStore.put({
          ...legacyRun,
          key: `library:${legacyRun.quizId}`,
          source: "library",
        });
      }
    };
  },
];

const DB_VERSION = migrations.length;

let databasePromise: Promise<IDBDatabase> | undefined;

function openDatabase(): Promise<IDBDatabase> {
  databasePromise ??= new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = (event) => {
      const db = request.result;

      for (let version = event.oldVersion; version < DB_VERSION; version += 1) {
        migrations[version]!(db, request.transaction!);
      }
    };

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error ?? new Error("Failed to open the database."));
  });

  return databasePromise;
}

export function requestToPromise<Value>(request: IDBRequest<Value>): Promise<Value> {
  return new Promise((resolve, reject) => {
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error ?? new Error("IndexedDB request failed."));
  });
}

/**
 * Runs `operation` inside a transaction over the given stores and resolves
 * after the transaction commits, so writes are durable when the promise settles.
 */
export async function withTransaction<Result>(
  storeNames: string[],
  mode: IDBTransactionMode,
  operation: (transaction: IDBTransaction) => Promise<Result>,
): Promise<Result> {
  const db = await openDatabase();
  const transaction = db.transaction(storeNames, mode);
  const result = await operation(transaction);

  await new Promise<void>((resolve, reject) => {
    transaction.oncomplete = () => resolve();
    transaction.onerror = () => reject(transaction.error ?? new Error("Transaction failed."));
    transaction.onabort = () => reject(transaction.error ?? new Error("Transaction aborted."));
  });

  return result;
}

/** Test-only: closes the cached connection so a fresh (fake) IndexedDB can be swapped in. */
export async function closeDatabaseForTests(): Promise<void> {
  if (databasePromise === undefined) return;

  const db = await databasePromise;
  db.close();
  databasePromise = undefined;
}
