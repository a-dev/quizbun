import type { Question, Quiz } from "@/shared/lib/quiz";
import type { PageSize } from "@/shared/lib/storage";
import type { QuestionProgress } from "@/shared/lib/storage";

/**
 * Run engine (T6.1): quiz + saved answers in, derived player state out.
 * Pure logic, no React, no storage access. Answers key by Question id —
 * never by page — so re-chunking on a Page-size change loses nothing.
 */

export interface PlayerQuestion {
  question: Question;
  /** Index in the Quiz's original Question order (0-based). */
  index: number;
  /** Present iff the Question is submitted (locked for the Run). */
  progress: QuestionProgress | undefined;
}

export interface PlayerPage {
  index: number;
  questions: PlayerQuestion[];
}

export type Answers = Record<string, QuestionProgress>;

/** Chunks the Quiz's Questions, in original order, into pages of `pageSize`. */
export function chunkIntoPages(quiz: Quiz, answers: Answers, pageSize: PageSize): PlayerPage[] {
  const pages: PlayerPage[] = [];

  for (let start = 0; start < quiz.questions.length; start += pageSize) {
    pages.push({
      index: pages.length,
      questions: quiz.questions.slice(start, start + pageSize).map((question, offset) => ({
        question,
        index: start + offset,
        progress: answers[question.id],
      })),
    });
  }

  return pages;
}

export function countSubmitted(quiz: Quiz, answers: Answers): number {
  // Count via the Quiz, not the answers record, so stale entries for removed
  // Questions can never inflate the total.
  return quiz.questions.filter((question) => answers[question.id] !== undefined).length;
}

/** Every Question submitted — the only state in which Finish appears (T6.6). */
export function isRunComplete(quiz: Quiz, answers: Answers): boolean {
  return countSubmitted(quiz, answers) === quiz.questions.length;
}

/**
 * Resume rule (T6.5): the first page containing an unsubmitted Question.
 * Falls back to the first page when everything is submitted.
 */
export function firstUnsubmittedPageIndex(pages: PlayerPage[]): number {
  const found = pages.find((page) => page.questions.some(({ progress }) => progress === undefined));

  return found?.index ?? 0;
}

/**
 * Maps the current page to its counterpart after a Page-size change: the page
 * that contains the first Question of the previously visible page.
 */
export function pageIndexAfterResize(
  currentPageIndex: number,
  oldPageSize: PageSize,
  newPageSize: PageSize,
): number {
  return Math.floor((currentPageIndex * oldPageSize) / newPageSize);
}

export function pageIndexForQuestionId(pages: readonly PlayerPage[], questionId: string): number {
  return (
    pages.find((page) => page.questions.some(({ question }) => question.id === questionId))
      ?.index ?? 0
  );
}

export function firstQuestionIdOnPage(page: PlayerPage): string {
  return page.questions[0]?.question.id ?? "";
}

export function countCorrect(quiz: Quiz, answers: Answers): number {
  return quiz.questions.filter((question) => answers[question.id]?.isCorrect === true).length;
}
