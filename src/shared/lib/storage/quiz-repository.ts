import type { Quiz } from "../quiz";
import { QUIZZES_STORE, RUNS_STORE, requestToPromise, withTransaction } from "./db";
import { computeQuestionHashes, reconcileRunAnswers, runKey } from "./run-repository";
import type { QuizSummary, Run, StoredQuiz } from "./types";

// The quiz repository is the Library: Catalog quizzes never enter IndexedDB,
// so every Run touched here lives in the "library" namespace.

export async function saveQuiz(quiz: Quiz): Promise<void> {
  const stored: StoredQuiz = { quiz, importedAt: Date.now() };

  await withTransaction([QUIZZES_STORE], "readwrite", async (transaction) => {
    await requestToPromise(transaction.objectStore(QUIZZES_STORE).put(stored));
  });
}

export async function getQuiz(id: string): Promise<StoredQuiz | undefined> {
  return withTransaction([QUIZZES_STORE], "readonly", async (transaction) => {
    const stored: StoredQuiz | undefined = await requestToPromise(
      transaction.objectStore(QUIZZES_STORE).get(id),
    );

    return stored;
  });
}

export async function quizExists(id: string): Promise<boolean> {
  return withTransaction([QUIZZES_STORE], "readonly", async (transaction) => {
    const count = await requestToPromise(transaction.objectStore(QUIZZES_STORE).count(id));

    return count > 0;
  });
}

export async function listQuizzes(): Promise<QuizSummary[]> {
  return withTransaction([QUIZZES_STORE], "readonly", async (transaction) => {
    const stored: StoredQuiz[] = await requestToPromise(
      transaction.objectStore(QUIZZES_STORE).getAll(),
    );

    return stored.map(({ quiz, importedAt }) => ({
      id: quiz.id,
      title: quiz.title,
      ...(quiz.description !== undefined && { description: quiz.description }),
      tags: quiz.tags,
      questionCount: quiz.questions.length,
      importedAt,
    }));
  });
}

/** Deletes a quiz and cascades to its Run. */
export async function deleteQuiz(id: string): Promise<void> {
  await withTransaction([QUIZZES_STORE, RUNS_STORE], "readwrite", async (transaction) => {
    await Promise.all([
      requestToPromise(transaction.objectStore(QUIZZES_STORE).delete(id)),
      requestToPromise(transaction.objectStore(RUNS_STORE).delete(runKey("library", id))),
    ]);
  });
}

/**
 * Replaces a quiz with the same id, reconciling Run progress: a saved answer
 * survives iff a Question with the same id exists in the new version and its
 * Content hash still matches; everything else is discarded.
 */
export async function replaceQuiz(quiz: Quiz): Promise<void> {
  const newHashes = await computeQuestionHashes(quiz);

  await withTransaction([QUIZZES_STORE, RUNS_STORE], "readwrite", async (transaction) => {
    const runsStore = transaction.objectStore(RUNS_STORE);
    const existingRun: Run | undefined = await requestToPromise(
      runsStore.get(runKey("library", quiz.id)),
    );

    const stored: StoredQuiz = { quiz, importedAt: Date.now() };
    await requestToPromise(transaction.objectStore(QUIZZES_STORE).put(stored));

    if (existingRun === undefined) return;

    const reconciledRun = reconcileRunAnswers(quiz, existingRun, newHashes);

    if (reconciledRun === undefined) {
      await requestToPromise(runsStore.delete(existingRun.key));
      return;
    }

    await requestToPromise(runsStore.put(reconciledRun));
  });
}
