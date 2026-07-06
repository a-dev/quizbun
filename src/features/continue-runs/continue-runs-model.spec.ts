import { describe, expect, test } from "vitest";

import type { PublicQuizSummary } from "@/shared/lib/content";
import type { QuizSummary, Run } from "@/shared/lib/storage";

import { resolveContinueRuns } from "./continue-runs-model";

const catalogSummaries: PublicQuizSummary[] = [
  {
    id: "catalog-one",
    title: "Catalog one",
    tags: ["javascript"],
    questionCount: 3,
    addedAt: "2026-01-01T00:00:00.000Z",
  },
];

const librarySummaries: QuizSummary[] = [
  {
    id: "library-one",
    title: "Library one",
    tags: ["local"],
    questionCount: 2,
    importedAt: 1,
  },
];

function run(source: Run["source"], quizId: string, answeredIds: string[]): Run {
  return {
    key: `${source}:${quizId}`,
    source,
    quizId,
    answers: Object.fromEntries(
      answeredIds.map((questionId) => [
        questionId,
        { contentHash: questionId, submittedAnswer: 0, isCorrect: true },
      ]),
    ),
    startedAt: 1,
    updatedAt: 2,
  };
}

describe("resolveContinueRuns", () => {
  test("resolves Catalog and Library Runs to display rows", () => {
    expect(
      resolveContinueRuns({
        runs: [run("catalog", "catalog-one", ["q1"]), run("library", "library-one", ["q1"])],
        catalogSummaries,
        librarySummaries,
        limit: 5,
      }),
    ).toEqual([
      {
        key: "catalog:catalog-one",
        source: "catalog",
        title: "Catalog one",
        hrefPath: "quizzes/catalog-one/",
        answered: 1,
        total: 3,
      },
      {
        key: "library:library-one",
        source: "library",
        title: "Library one",
        hrefPath: "library/quiz/?id=library-one",
        answered: 1,
        total: 2,
      },
    ]);
  });

  test("skips Runs whose quiz no longer resolves and keeps taking until the limit", () => {
    expect(
      resolveContinueRuns({
        runs: [
          run("catalog", "missing-catalog", ["q1"]),
          run("library", "library-one", ["q1"]),
          run("library", "missing-library", ["q1"]),
          run("catalog", "catalog-one", ["q1"]),
        ],
        catalogSummaries,
        librarySummaries,
        limit: 2,
      }).map((displayRun) => displayRun.key),
    ).toEqual(["library:library-one", "catalog:catalog-one"]);
  });

  test("encodes quiz ids in route paths", () => {
    const encodedCatalog: PublicQuizSummary = {
      id: "catalog/one",
      title: "Catalog",
      tags: [],
      questionCount: 1,
      addedAt: "2026-01-01T00:00:00.000Z",
    };
    const encodedLibrary: QuizSummary = {
      id: "library one",
      title: "Library",
      tags: [],
      questionCount: 1,
      importedAt: 1,
    };

    expect(
      resolveContinueRuns({
        runs: [run("catalog", "catalog/one", ["q1"]), run("library", "library one", ["q1"])],
        catalogSummaries: [encodedCatalog],
        librarySummaries: [encodedLibrary],
        limit: 5,
      }).map((displayRun) => displayRun.hrefPath),
    ).toEqual(["quizzes/catalog%2Fone/", "library/quiz/?id=library%20one"]);
  });
});
