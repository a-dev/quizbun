import type { Quiz } from "../quiz";
import { computeContentHash } from "../quiz/content-hash";
import { requestToPromise, RUNS_STORE, withTransaction } from "./db";
import type { QuestionProgress, Run, RunSource, RunStatus } from "./types";

/**
 * The quiz itself is injected by the caller (Library: IndexedDB; Catalog:
 * build-time props), so this repository never reads the `quizzes` store —
 * the same Run machinery serves both namespaces.
 */

export function runKey(source: RunSource, quizId: string) {
  return `${source}:${quizId}`;
}

export async function getRun(source: RunSource, quizId: string): Promise<Run | undefined> {
  return withTransaction([RUNS_STORE], "readonly", async (transaction) => {
    const run: Run | undefined = await requestToPromise(
      transaction.objectStore(RUNS_STORE).get(runKey(source, quizId)),
    );

    return run;
  });
}

/** Returns unfinished Runs across Catalog and Library, newest activity first. */
export async function listUnfinishedRuns(): Promise<Run[]> {
  return withTransaction([RUNS_STORE], "readonly", async (transaction) => {
    const runs: Run[] = await requestToPromise(transaction.objectStore(RUNS_STORE).getAll());

    return runs
      .filter((run) => run.finishedAt === undefined)
      .sort((left, right) => {
        const rightActivity = right.updatedAt ?? right.startedAt;
        const leftActivity = left.updatedAt ?? left.startedAt;

        return rightActivity - leftActivity || left.key.localeCompare(right.key);
      });
  });
}

/**
 * Auto-save on every submit: records one Question's progress, creating the Run
 * on the first answer and marking it finished once every Question is answered.
 */
export async function saveAnswer(
  source: RunSource,
  quiz: Quiz,
  questionId: string,
  progress: QuestionProgress,
): Promise<Run> {
  return withTransaction([RUNS_STORE], "readwrite", async (transaction) => {
    const runsStore = transaction.objectStore(RUNS_STORE);
    const existingRun: Run | undefined = await requestToPromise(
      runsStore.get(runKey(source, quiz.id)),
    );
    const now = Date.now();

    const answers = { ...existingRun?.answers, [questionId]: progress };
    const isFinished = Object.keys(answers).length === quiz.questions.length;

    const run: Run = {
      key: runKey(source, quiz.id),
      source,
      quizId: quiz.id,
      answers,
      startedAt: existingRun?.startedAt ?? now,
      updatedAt: now,
      ...(isFinished && { finishedAt: existingRun?.finishedAt ?? now }),
    };

    await requestToPromise(runsStore.put(run));

    return run;
  });
}

/** Retake and Reset progress are the same operation: the saved Run is deleted. */
export async function resetRun(source: RunSource, quizId: string): Promise<void> {
  await withTransaction([RUNS_STORE], "readwrite", async (transaction) => {
    await requestToPromise(transaction.objectStore(RUNS_STORE).delete(runKey(source, quizId)));
  });
}

/**
 * Feeds the state-aware primary action (Start / Continue / See summary) and the
 * header progress meta ("X of Y answered"); the count lives in the header, not
 * the button label.
 */
export async function getRunStatus(source: RunSource, quiz: Quiz): Promise<RunStatus> {
  const run = await getRun(source, quiz.id);

  if (run === undefined) return { kind: "none" };

  const answered = Object.keys(run.answers).length;

  return {
    kind: run.finishedAt === undefined ? "in-progress" : "finished",
    answered,
    total: quiz.questions.length,
  };
}

/**
 * Content-hash invalidation against the current quiz content: a saved answer
 * survives iff a Question with the same id exists and its Content hash still
 * matches. The Library applies this on re-import (`replaceQuiz`); the Catalog
 * applies it on page load, because a deployed quiz changes via PR without any
 * import step on the visitor's device.
 */
export async function reconcileRunWithQuiz(source: RunSource, quiz: Quiz): Promise<void> {
  const existingRun = await getRun(source, quiz.id);
  if (existingRun === undefined) return;

  const reconciledRun = reconcileRunAnswers(quiz, existingRun, await computeQuestionHashes(quiz));

  await withTransaction([RUNS_STORE], "readwrite", async (transaction) => {
    const runsStore = transaction.objectStore(RUNS_STORE);

    if (reconciledRun === undefined) {
      await requestToPromise(runsStore.delete(existingRun.key));
    } else {
      await requestToPromise(runsStore.put(reconciledRun));
    }
  });
}

/** Current Content hash per Question id. Hash before opening a transaction:
 * awaiting non-IndexedDB work inside one lets it auto-commit. */
export async function computeQuestionHashes(quiz: Quiz): Promise<Map<string, string>> {
  return new Map(
    await Promise.all(
      quiz.questions.map(
        async (question) => [question.id, await computeContentHash(question)] as const,
      ),
    ),
  );
}

/**
 * Pure reconciliation step shared with `replaceQuiz`: returns the Run pruned
 * to answers whose Content hash still matches, or `undefined` when no answer
 * survives (the Run should be deleted). Synchronous so it can run inside an
 * open transaction.
 */
export function reconcileRunAnswers(
  quiz: Quiz,
  run: Run,
  currentHashes: ReadonlyMap<string, string>,
): Run | undefined {
  const keptAnswers = Object.fromEntries(
    Object.entries(run.answers).filter(
      ([questionId, progress]) => currentHashes.get(questionId) === progress.contentHash,
    ),
  );

  const keptCount = Object.keys(keptAnswers).length;
  if (keptCount === 0) return undefined;

  const isFinished = keptCount === quiz.questions.length;

  return {
    key: run.key,
    source: run.source,
    quizId: run.quizId,
    answers: keptAnswers,
    startedAt: run.startedAt,
    updatedAt: run.updatedAt ?? run.startedAt,
    ...(isFinished && { finishedAt: run.finishedAt ?? Date.now() }),
  };
}
