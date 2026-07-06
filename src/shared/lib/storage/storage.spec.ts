import { IDBFactory } from "fake-indexeddb";
import { beforeEach, describe, expect, test } from "vitest";

import type { Question, Quiz } from "../quiz";
import { computeContentHash } from "../quiz/content-hash";
import { closeDatabaseForTests, requestToPromise, RUNS_STORE, withTransaction } from "./db";
import {
  deleteQuiz,
  getQuiz,
  listQuizzes,
  quizExists,
  replaceQuiz,
  saveQuiz,
} from "./quiz-repository";
import {
  getRun,
  getRunStatus,
  listUnfinishedRuns,
  reconcileRunWithQuiz,
  resetRun,
  saveAnswer,
} from "./run-repository";
import type { QuestionProgress, Run } from "./types";

function makeQuestion(id: string, title: string): Question {
  return {
    id,
    type: "single-choice",
    title,
    explanation: `Explanation for ${title}.`,
    options: [
      { text: "Right", isCorrect: true },
      { text: "Wrong", isCorrect: false },
    ],
  };
}

const sampleQuiz: Quiz = {
  schemaVersion: 1,
  id: "sample-quiz",
  title: "Sample quiz",
  tags: ["sample"],
  questions: [makeQuestion("q-one", "One"), makeQuestion("q-two", "Two")],
};

async function progressFor(question: Question): Promise<QuestionProgress> {
  return {
    contentHash: await computeContentHash(question),
    submittedAnswer: 0,
    isCorrect: true,
  };
}

async function putRunForTests(run: Run | Omit<Run, "updatedAt">): Promise<void> {
  await withTransaction([RUNS_STORE], "readwrite", async (transaction) => {
    await requestToPromise(transaction.objectStore(RUNS_STORE).put(run));
  });
}

beforeEach(async () => {
  await closeDatabaseForTests();
  globalThis.indexedDB = new IDBFactory();
});

describe("quiz repository", () => {
  test("saveQuiz / getQuiz round-trips the Quiz with an import timestamp", async () => {
    await saveQuiz(sampleQuiz);
    const stored = await getQuiz("sample-quiz");

    expect(stored?.quiz).toEqual(sampleQuiz);
    expect(stored?.importedAt).toEqual(expect.any(Number));
  });

  test("getQuiz returns undefined for an unknown id", async () => {
    expect(await getQuiz("missing")).toBeUndefined();
  });

  test("quizExists reports id collisions", async () => {
    expect(await quizExists("sample-quiz")).toBe(false);
    await saveQuiz(sampleQuiz);
    expect(await quizExists("sample-quiz")).toBe(true);
  });

  test("listQuizzes projects Library metadata", async () => {
    await saveQuiz(sampleQuiz);

    expect(await listQuizzes()).toEqual([
      {
        id: "sample-quiz",
        title: "Sample quiz",
        tags: ["sample"],
        questionCount: 2,
        importedAt: expect.any(Number),
      },
    ]);
  });

  test("deleteQuiz cascades to the Run", async () => {
    await saveQuiz(sampleQuiz);
    await saveAnswer("library", sampleQuiz, "q-one", await progressFor(sampleQuiz.questions[0]!));

    await deleteQuiz("sample-quiz");

    expect(await getQuiz("sample-quiz")).toBeUndefined();
    expect(await getRun("library", "sample-quiz")).toBeUndefined();
  });
});

describe("run repository", () => {
  test("saveAnswer creates the Run and getRunStatus reports in-progress X of Y", async () => {
    expect(await getRunStatus("library", sampleQuiz)).toEqual({ kind: "none" });

    await saveAnswer("library", sampleQuiz, "q-one", await progressFor(sampleQuiz.questions[0]!));

    expect(await getRunStatus("library", sampleQuiz)).toEqual({
      kind: "in-progress",
      answered: 1,
      total: 2,
    });
  });

  test("saveAnswer bumps updatedAt on every saved answer", async () => {
    await saveAnswer("library", sampleQuiz, "q-one", await progressFor(sampleQuiz.questions[0]!));
    const firstRun = await getRun("library", "sample-quiz");

    await saveAnswer("library", sampleQuiz, "q-two", await progressFor(sampleQuiz.questions[1]!));
    const secondRun = await getRun("library", "sample-quiz");

    expect(firstRun?.updatedAt).toEqual(expect.any(Number));
    expect(secondRun?.startedAt).toBe(firstRun?.startedAt);
    expect(secondRun!.updatedAt).toBeGreaterThanOrEqual(firstRun!.updatedAt);
  });

  test("answering every Question finishes the Run", async () => {
    await saveAnswer("library", sampleQuiz, "q-one", await progressFor(sampleQuiz.questions[0]!));
    await saveAnswer("library", sampleQuiz, "q-two", await progressFor(sampleQuiz.questions[1]!));

    const run = await getRun("library", "sample-quiz");
    expect(run?.finishedAt).toEqual(expect.any(Number));
    expect(await getRunStatus("library", sampleQuiz)).toEqual({
      kind: "finished",
      answered: 2,
      total: 2,
    });
  });

  test("resetRun deletes the saved Run", async () => {
    await saveAnswer("library", sampleQuiz, "q-one", await progressFor(sampleQuiz.questions[0]!));
    await resetRun("library", "sample-quiz");

    expect(await getRun("library", "sample-quiz")).toBeUndefined();
    expect(await getRunStatus("library", sampleQuiz)).toEqual({ kind: "none" });
  });

  test("catalog and library Runs on the same quiz id are independent", async () => {
    await saveAnswer("catalog", sampleQuiz, "q-one", await progressFor(sampleQuiz.questions[0]!));
    await saveAnswer("library", sampleQuiz, "q-two", await progressFor(sampleQuiz.questions[1]!));

    expect(Object.keys((await getRun("catalog", "sample-quiz"))!.answers)).toEqual(["q-one"]);
    expect(Object.keys((await getRun("library", "sample-quiz"))!.answers)).toEqual(["q-two"]);

    await resetRun("catalog", "sample-quiz");

    expect(await getRun("catalog", "sample-quiz")).toBeUndefined();
    expect(await getRunStatus("library", sampleQuiz)).toEqual({
      kind: "in-progress",
      answered: 1,
      total: 2,
    });
  });

  test("reconcileRunWithQuiz drops answers for changed Questions (Catalog PR edits)", async () => {
    await saveAnswer("catalog", sampleQuiz, "q-one", await progressFor(sampleQuiz.questions[0]!));
    await saveAnswer("catalog", sampleQuiz, "q-two", await progressFor(sampleQuiz.questions[1]!));

    const edited: Quiz = {
      ...sampleQuiz,
      questions: [makeQuestion("q-one", "One"), makeQuestion("q-two", "Two, reworded")],
    };

    await reconcileRunWithQuiz("catalog", edited);

    expect(Object.keys((await getRun("catalog", "sample-quiz"))!.answers)).toEqual(["q-one"]);
    expect(await getRunStatus("catalog", edited)).toEqual({
      kind: "in-progress",
      answered: 1,
      total: 2,
    });
  });

  test("reconcileRunWithQuiz deletes the Run when no answer survives", async () => {
    await saveAnswer("catalog", sampleQuiz, "q-one", await progressFor(sampleQuiz.questions[0]!));

    const edited: Quiz = {
      ...sampleQuiz,
      questions: [makeQuestion("q-one", "One, reworded"), makeQuestion("q-two", "Two")],
    };

    await reconcileRunWithQuiz("catalog", edited);

    expect(await getRun("catalog", "sample-quiz")).toBeUndefined();
  });

  test("listUnfinishedRuns returns unfinished Runs across namespaces by newest activity", async () => {
    await putRunForTests({
      key: "library:older-library",
      source: "library",
      quizId: "older-library",
      answers: {},
      startedAt: 10,
      updatedAt: 100,
    });
    await putRunForTests({
      key: "catalog:newer-catalog",
      source: "catalog",
      quizId: "newer-catalog",
      answers: {},
      startedAt: 20,
      updatedAt: 300,
    });
    await putRunForTests({
      key: "library:middle-library",
      source: "library",
      quizId: "middle-library",
      answers: {},
      startedAt: 30,
      updatedAt: 200,
    });

    expect((await listUnfinishedRuns()).map((run) => run.key)).toEqual([
      "catalog:newer-catalog",
      "library:middle-library",
      "library:older-library",
    ]);
  });

  test("listUnfinishedRuns excludes finished Runs", async () => {
    await putRunForTests({
      key: "library:unfinished",
      source: "library",
      quizId: "unfinished",
      answers: {},
      startedAt: 10,
      updatedAt: 100,
    });
    await putRunForTests({
      key: "catalog:finished",
      source: "catalog",
      quizId: "finished",
      answers: {},
      startedAt: 20,
      updatedAt: 200,
      finishedAt: 300,
    });

    expect((await listUnfinishedRuns()).map((run) => run.key)).toEqual(["library:unfinished"]);
  });

  test("listUnfinishedRuns falls back to startedAt for legacy Runs without updatedAt", async () => {
    await putRunForTests({
      key: "catalog:newer-legacy",
      source: "catalog",
      quizId: "newer-legacy",
      answers: {},
      startedAt: 300,
    });
    await putRunForTests({
      key: "library:older-current",
      source: "library",
      quizId: "older-current",
      answers: {},
      startedAt: 100,
      updatedAt: 200,
    });

    expect((await listUnfinishedRuns()).map((run) => run.key)).toEqual([
      "catalog:newer-legacy",
      "library:older-current",
    ]);
  });
});

describe("database migration", () => {
  test("v1 Runs keyed by quizId migrate into the library namespace", async () => {
    // Build a version-1 database by hand, as M2 left it on a device.
    await new Promise<void>((resolve, reject) => {
      const request = indexedDB.open("quizbun", 1);

      request.onupgradeneeded = () => {
        request.result.createObjectStore("quizzes", { keyPath: "quiz.id" });
        request.result.createObjectStore("runs", { keyPath: "quizId" });
      };
      request.onsuccess = () => {
        const db = request.result;
        const transaction = db.transaction("runs", "readwrite");

        transaction.objectStore("runs").put({
          quizId: "sample-quiz",
          answers: {},
          startedAt: 1,
        });
        transaction.oncomplete = () => {
          db.close();
          resolve();
        };
        transaction.onerror = () => reject(transaction.error);
      };
      request.onerror = () => reject(request.error);
    });

    const run = await getRun("library", "sample-quiz");

    expect(run?.key).toBe("library:sample-quiz");
    expect(run?.source).toBe("library");
    expect(run?.startedAt).toBe(1);
    expect(await getRun("catalog", "sample-quiz")).toBeUndefined();
  });
});

describe("replaceQuiz progress reconciliation", () => {
  beforeEach(async () => {
    await saveQuiz(sampleQuiz);
    await saveAnswer("library", sampleQuiz, "q-one", await progressFor(sampleQuiz.questions[0]!));
    await saveAnswer("library", sampleQuiz, "q-two", await progressFor(sampleQuiz.questions[1]!));
  });

  test("unchanged Question keeps its answer; changed Question resets", async () => {
    const newVersion: Quiz = {
      ...sampleQuiz,
      questions: [makeQuestion("q-one", "One"), makeQuestion("q-two", "Two, reworded")],
    };

    await replaceQuiz(newVersion);

    const run = await getRun("library", "sample-quiz");
    expect(Object.keys(run!.answers)).toEqual(["q-one"]);
    expect((await getQuiz("sample-quiz"))?.quiz).toEqual(newVersion);
    expect(await getRunStatus("library", newVersion)).toEqual({
      kind: "in-progress",
      answered: 1,
      total: 2,
    });
  });

  test("removed Question's answer is discarded", async () => {
    const newVersion: Quiz = {
      ...sampleQuiz,
      questions: [makeQuestion("q-one", "One"), makeQuestion("q-three", "Three")],
    };

    await replaceQuiz(newVersion);

    expect(Object.keys((await getRun("library", "sample-quiz"))!.answers)).toEqual(["q-one"]);
  });

  test("all Questions changed deletes the Run", async () => {
    const newVersion: Quiz = {
      ...sampleQuiz,
      questions: [makeQuestion("q-one", "One, reworded"), makeQuestion("q-two", "Two, reworded")],
    };

    await replaceQuiz(newVersion);

    expect(await getRun("library", "sample-quiz")).toBeUndefined();
    expect(await getRunStatus("library", newVersion)).toEqual({ kind: "none" });
  });

  test("fully unchanged quiz keeps the finished Run", async () => {
    await replaceQuiz(structuredClone(sampleQuiz));

    expect(await getRunStatus("library", sampleQuiz)).toEqual({
      kind: "finished",
      answered: 2,
      total: 2,
    });
  });
});
