import { beforeEach, describe, expect, it, vi } from "vitest";
import { page } from "vitest/browser";

import type { Quiz } from "@/shared/lib/quiz";
import { getRun, resetRun } from "@/shared/lib/storage";
import type { QuestionProgress } from "@/shared/lib/storage";

import type { PlayerModel } from "./use-player";
import { usePlayer } from "./use-player";

const quiz: Quiz = {
  schemaVersion: 1,
  id: "use-player-progress-identity",
  title: "Progress identity",
  tags: ["test"],
  questions: [
    {
      id: "falsy",
      type: "single-choice",
      title: "Which JavaScript value is falsy?",
      explanation: "`0` is falsy.",
      options: [
        { text: "`0`", isCorrect: true },
        { text: "`[]`", isCorrect: false },
      ],
    },
    {
      id: "typeof-null",
      type: "single-choice",
      title: "What does `typeof null` return?",
      explanation: 'It returns `"object"`.',
      options: [
        { text: '`"object"`', isCorrect: true },
        { text: '`"null"`', isCorrect: false },
      ],
    },
  ],
};

const [questionA, questionB] = quiz.questions as [Quiz["questions"][0], Quiz["questions"][0]];

/** The progress the player exposes for one Question, read from its pages. */
function progressOf(model: PlayerModel, questionId: string): QuestionProgress | undefined {
  return model.pages
    .flatMap(({ questions }) => questions)
    .find(({ question }) => question.id === questionId)?.progress;
}

describe("usePlayer", () => {
  beforeEach(async () => {
    await resetRun("library", quiz.id);
  });

  it("keeps an answered Question's progress reference when another Question is submitted", async () => {
    const { result, act } = await page.renderHook(() =>
      usePlayer({
        quiz,
        source: "library",
        urlView: "questions",
        urlQuestionId: undefined,
      }),
    );

    await vi.waitFor(() => expect(result.current.status).toBe("ready"));

    await act(() => result.current.onSubmit(questionA, 0, true));
    await vi.waitFor(() => expect(progressOf(result.current, questionA.id)).toBeDefined());
    const progressA = progressOf(result.current, questionA.id);

    await act(() => result.current.onSubmit(questionB, 1, false));
    await vi.waitFor(() => expect(progressOf(result.current, questionB.id)).toBeDefined());

    // React Compiler caches each QuestionCard by prop reference; a fresh copy
    // of Question A's progress would re-render its card on every submit.
    expect(progressOf(result.current, questionA.id)).toBe(progressA);
    expect(progressOf(result.current, questionB.id)).toMatchObject({
      submittedAnswer: 1,
      isCorrect: false,
    });
    expect(result.current.complete).toBe(true);

    const run = await getRun("library", quiz.id);
    expect(run?.answers).toEqual({
      [questionA.id]: progressA,
      [questionB.id]: progressOf(result.current, questionB.id),
    });
    expect(run?.finishedAt).toBeDefined();
  });
});
