import { describe, expect, test } from "vitest";

import type { Question, Quiz } from "@/shared/lib/quiz";
import type { QuestionProgress } from "@/shared/lib/storage";

import {
  chunkIntoPages,
  countCorrect,
  countSubmitted,
  firstUnsubmittedPageIndex,
  firstQuestionIdOnPage,
  isRunComplete,
  pageIndexForQuestionId,
  pageIndexAfterResize,
} from "./run-engine";

function makeQuestion(id: string): Question {
  return {
    id,
    title: `Question ${id}`,
    explanation: "Because.",
    type: "single-choice",
    options: [
      { text: "Right", isCorrect: true },
      { text: "Wrong", isCorrect: false },
    ],
  };
}

function makeQuiz(questionCount: number): Quiz {
  return {
    schemaVersion: 1,
    id: "engine-test",
    title: "Engine test",
    tags: [],
    questions: Array.from({ length: questionCount }, (_, index) => makeQuestion(`q${index + 1}`)),
  };
}

function progress(isCorrect: boolean): QuestionProgress {
  return { contentHash: "hash", submittedAnswer: 0, isCorrect };
}

describe("chunkIntoPages", () => {
  test("chunks Questions in original order with the last page short", () => {
    const pages = chunkIntoPages(makeQuiz(7), {}, 3);

    expect(pages.map((page) => page.questions.length)).toEqual([3, 3, 1]);
    expect(pages[1]!.questions.map(({ question }) => question.id)).toEqual(["q4", "q5", "q6"]);
    expect(pages[2]!.questions[0]!.index).toBe(6);
  });

  test("attaches progress by Question id", () => {
    const pages = chunkIntoPages(makeQuiz(2), { q2: progress(true) }, 5);
    const [first, second] = pages[0]!.questions;

    expect(first!.progress).toBeUndefined();
    expect(second!.progress?.isCorrect).toBe(true);
  });

  test("re-chunking on a Page-size change loses nothing (answers key by id)", () => {
    const quiz = makeQuiz(7);
    const answers = { q3: progress(true), q7: progress(false) };

    for (const pageSize of [1, 3, 5, 10] as const) {
      const submitted = chunkIntoPages(quiz, answers, pageSize)
        .flatMap((page) => page.questions)
        .filter(({ progress: p }) => p !== undefined)
        .map(({ question }) => question.id);

      expect(submitted).toEqual(["q3", "q7"]);
    }
  });
});

describe("completion", () => {
  test("countSubmitted ignores stale entries for removed Questions", () => {
    expect(countSubmitted(makeQuiz(2), { q1: progress(true), gone: progress(true) })).toBe(1);
  });

  test("isRunComplete only when every Question is submitted", () => {
    const quiz = makeQuiz(2);

    expect(isRunComplete(quiz, { q1: progress(true) })).toBe(false);
    expect(isRunComplete(quiz, { q1: progress(true), q2: progress(false) })).toBe(true);
  });

  test("countCorrect counts only correct submissions", () => {
    expect(countCorrect(makeQuiz(3), { q1: progress(true), q2: progress(false) })).toBe(1);
  });
});

describe("firstUnsubmittedPageIndex", () => {
  test("lands on the first page containing an unsubmitted Question", () => {
    const pages = chunkIntoPages(
      makeQuiz(7),
      { q1: progress(true), q2: progress(true), q3: progress(true), q4: progress(true) },
      3,
    );

    expect(firstUnsubmittedPageIndex(pages)).toBe(1);
  });

  test("falls back to the first page when everything is submitted", () => {
    const answers = { q1: progress(true), q2: progress(false) };

    expect(firstUnsubmittedPageIndex(chunkIntoPages(makeQuiz(2), answers, 1))).toBe(0);
  });
});

describe("pageIndexAfterResize", () => {
  test("keeps the first visible Question on screen", () => {
    // Page 2 of size 3 starts at q7 (index 6) → page 6 of size 1, page 0 of size 10.
    expect(pageIndexAfterResize(2, 3, 1)).toBe(6);
    expect(pageIndexAfterResize(2, 3, 10)).toBe(0);
    expect(pageIndexAfterResize(6, 1, 5)).toBe(1);
  });
});

describe("Question lookup", () => {
  test("finds the page containing a Question id", () => {
    const pages = chunkIntoPages(makeQuiz(7), {}, 3);

    expect(pageIndexForQuestionId(pages, "q5")).toBe(1);
    expect(pageIndexForQuestionId(pages, "gone")).toBe(0);
  });

  test("returns the first Question id on a page", () => {
    const pages = chunkIntoPages(makeQuiz(7), {}, 3);

    expect(firstQuestionIdOnPage(pages[2]!)).toBe("q7");
  });
});
