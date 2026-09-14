import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import type { RefObject } from "react";

import { flushSync } from "react-dom";

import { messageFromError } from "@/shared/lib/errors";
import { computeContentHash } from "@/shared/lib/quiz";
import type { Question, Quiz } from "@/shared/lib/quiz";
import { questionAnchorId } from "@/shared/lib/routing";
import type { PlayerUrlState } from "@/shared/lib/routing";
import {
  DEFAULT_PAGE_SIZE,
  getPageSize,
  getRun,
  resetRun,
  saveAnswer,
  setPageSize as persistPageSize,
} from "@/shared/lib/storage";
import type { PageSize, RunSource, SubmittedAnswer } from "@/shared/lib/storage";
import { holdViewTransitionUntil } from "@/shared/lib/view-transition";

import { createOptionOrderByQuestionId } from "./option-order";
import type { OptionOrderByQuestionId } from "./option-order";
import {
  chunkIntoPages,
  countSubmitted,
  firstQuestionIdOnPage,
  firstUnsubmittedPageIndex,
  isRunComplete,
  pageIndexAfterResize,
  pageIndexForQuestionId,
} from "./run-engine";
import type { Answers, PlayerPage } from "./run-engine";

export type View = "questions" | "summary";

export interface UsePlayerParams {
  quiz: Quiz;
  source: RunSource;
  urlView: View;
  urlQuestionId: string | undefined;
  onUrlStateChange?: (state: PlayerUrlState) => void;
}

/** What the player UI needs to render — no storage or routing concerns leak out. */
export interface PlayerModel {
  /** Drives the top-level render branch in the component. */
  status: "loading" | "load-error" | "ready";
  view: View;
  /** Inline, recoverable error (a failed submit/retake); the screen stays put. */
  error: string | undefined;
  answers: Answers;
  pages: PlayerPage[];
  currentPage: PlayerPage | undefined;
  pageSize: PageSize;
  submitted: number;
  complete: boolean;
  /** In-memory display order; answer values remain original Option indexes. */
  optionOrderByQuestionId: OptionOrderByQuestionId;
  headingRef: RefObject<HTMLHeadingElement | null>;
  onSubmit: (question: Question, answer: SubmittedAnswer, isCorrect: boolean) => void;
  changePageSize: (next: PageSize) => void;
  goToPage: (pageNumber: number) => void;
  showSummary: () => void;
  reviewQuestion: (questionId: string) => void;
  retake: () => void;
}

/**
 * Player orchestration (T6): turns a Quiz + its persisted Run into renderable
 * state and the handlers that mutate it. The component is left purely
 * presentational.
 *
 * Answers always key by Question id, never by page, so re-chunking on a
 * Page-size change loses nothing. URL state is emitted directly from each
 * transition (rather than via an effect that mirrors state) — fewer effects,
 * and no re-fire when the parent passes a fresh `onUrlStateChange`.
 */
export function usePlayer({
  quiz,
  source,
  urlView,
  urlQuestionId,
  onUrlStateChange,
}: UsePlayerParams): PlayerModel {
  // `undefined` answers = the Run hasn't loaded yet (IndexedDB is async).
  const [answers, setAnswers] = useState<Answers | undefined>(undefined);
  const [pageSize, setPageSizeState] = useState<PageSize>(DEFAULT_PAGE_SIZE);
  const [pageIndex, setPageIndex] = useState(0);
  const [activeQuestionId, setActiveQuestionId] = useState<string | undefined>(undefined);
  const [view, setView] = useState<View>("questions");
  const [loadError, setLoadError] = useState<string | undefined>(undefined);
  const [actionError, setActionError] = useState<string | undefined>(undefined);
  const [optionOrderByQuestionId, setOptionOrderByQuestionId] = useState<OptionOrderByQuestionId>(
    {},
  );
  const headingRef = useRef<HTMLHeadingElement>(null);
  const optionOrderSessionRef = useRef<{ quiz: Quiz; source: RunSource } | undefined>(undefined);

  // Keep the latest emitter without making every handler depend on its
  // identity. Assigning a ref during render is the supported "latest value"
  // pattern for callbacks read by effects/handlers.
  const emitRef = useRef(onUrlStateChange);
  emitRef.current = onUrlStateChange;
  const emitRunAnchor = useCallback((questionId: string | undefined) => {
    if (questionId !== undefined) emitRef.current?.({ mode: "run", questionId });
  }, []);
  const emitSummary = useCallback(() => emitRef.current?.({ mode: "summary" }), []);

  // Initial load: read the persisted Run + Page-size preference, then resume
  // where the user left off (T6.5). A finished Run defaults to its Summary —
  // unless the URL explicitly anchors a Question (the Summary's "Review" action),
  // which must win: that emit re-runs this effect, so forcing Summary here would
  // bounce the user straight back and Review would appear to do nothing.
  useEffect(() => {
    let cancelled = false;

    void (async () => {
      try {
        const initialPageSize = getPageSize();
        const run = await getRun(source, quiz.id);
        const loaded = run?.answers ?? {};

        if (cancelled) return;

        const pages = chunkIntoPages(quiz, loaded, initialPageSize);

        setPageSizeState(initialPageSize);
        setAnswers(loaded);
        // Renderer-only state: generated once for this mounted player session,
        // then kept stable while navigating its pages. It is never written to
        // the Quiz or the persisted Run.
        if (
          optionOrderSessionRef.current?.quiz !== quiz ||
          optionOrderSessionRef.current.source !== source
        ) {
          optionOrderSessionRef.current = { quiz, source };
          setOptionOrderByQuestionId(createOptionOrderByQuestionId(quiz));
        }

        // An anchored Question in "questions" view is an explicit Review request
        // (the id is already validated against the Quiz by `parsePlayerUrlState`).
        const reviewingQuestion = urlView === "questions" && urlQuestionId !== undefined;

        if (isRunComplete(quiz, loaded) && !reviewingQuestion) {
          commitNavigation(() => {
            setView("summary");
            emitSummary();
          });

          return;
        }

        const urlPageIndex =
          urlQuestionId === undefined ? undefined : pageIndexForQuestionId(pages, urlQuestionId);
        const nextPageIndex = urlPageIndex ?? firstUnsubmittedPageIndex(pages);
        const anchor = urlQuestionId ?? firstQuestionIdOnPage(pages[nextPageIndex]!);

        commitNavigation(() => {
          setView("questions");
          setPageIndex(nextPageIndex);
          setActiveQuestionId(anchor);
          emitRunAnchor(anchor);
        }, anchor);
      } catch (error) {
        if (!cancelled) setLoadError(messageFromError(error));
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [quiz, source, urlQuestionId, urlView, emitRunAnchor, emitSummary]);

  const isLoaded = answers !== undefined;

  // The player mounts inside the detail → player view transition while its
  // Run is still loading from IndexedDB. Hold the transition's new-state
  // capture open until the loaded view is committed, so the morph lands on
  // real content instead of a loader-only frame. Layout effects on purpose:
  // registration must happen inside the same synchronous flush that mounts
  // the player, and release right after the loaded commit is painted-ready.
  const releaseTransitionHold = useRef<(() => void) | undefined>(undefined);

  useLayoutEffect(() => {
    holdViewTransitionUntil(
      new Promise<void>((resolve) => {
        releaseTransitionHold.current = resolve;
      }),
    );

    // Unmounting mid-load must not keep a pending transition waiting.
    return () => releaseTransitionHold.current?.();
  }, []);

  useLayoutEffect(() => {
    // A load failure releases too — the capture then shows the error state.
    if (isLoaded || loadError !== undefined) releaseTransitionHold.current?.();
  }, [isLoaded, loadError]);

  /**
   * Commits one navigation and then puts the Learner where it landed (T7.1).
   *
   * Focus moves to the page heading: the player mounts from a primary action
   * whose button unmounts with the detail surface, so focus would otherwise
   * drop to `<body>`. When the URL anchors a Question, the viewport moves to
   * it — a fragment can name a Question that only exists once its page has
   * rendered, so the browser's one-shot fragment scroll during document load
   * cannot be relied on.
   *
   * `flushSync` lets both run from the caller instead of an effect: the
   * heading has to carry its new text before focus reaches it, and the new page
   * has to be in the DOM before `getElementById` can find the Question.
   */
  function commitNavigation(update: () => void, anchorQuestionId?: string) {
    flushSync(update);
    headingRef.current?.focus();

    if (anchorQuestionId === undefined) return;

    const anchorId = questionAnchorId(anchorQuestionId);

    if (window.location.hash !== `#${anchorId}`) return;

    document.getElementById(anchorId)?.scrollIntoView();
  }

  const pages = useMemo(
    () => (answers === undefined ? [] : chunkIntoPages(quiz, answers, pageSize)),
    [quiz, answers, pageSize],
  );
  const currentPage = pages[Math.min(pageIndex, pages.length - 1)];

  // Stable across renders so a memoized QuestionCard only re-renders when its
  // own props (question/progress) change, not on every sibling's submit.
  const onSubmit = useCallback(
    (question: Question, answer: SubmittedAnswer, isCorrect: boolean) => {
      void (async () => {
        setActionError(undefined);
        try {
          const contentHash = await computeContentHash(question);
          // Auto-save on every submit: a reload never loses a submitted answer.
          const run = await saveAnswer(source, quiz, question.id, {
            contentHash,
            submittedAnswer: answer,
            isCorrect,
          });

          setAnswers(run.answers);
        } catch (error) {
          setActionError(messageFromError(error));
        }
      })();
    },
    [quiz, source],
  );

  function changePageSize(next: PageSize) {
    if (answers === undefined || currentPage === undefined) return;

    const anchorQuestionId = activeQuestionId ?? firstQuestionIdOnPage(currentPage);
    const nextPages = chunkIntoPages(quiz, answers, next);
    // Immediate re-chunking: keep the current page's first Question visible.
    const nextPageIndex =
      anchorQuestionId === ""
        ? pageIndexAfterResize(currentPage.index, pageSize, next)
        : pageIndexForQuestionId(nextPages, anchorQuestionId);
    const nextAnchor = anchorQuestionId === "" ? undefined : anchorQuestionId;

    persistPageSize(next);

    const applyResize = () => {
      setPageIndex(nextPageIndex);
      setActiveQuestionId(nextAnchor);
      setPageSizeState(next);
      emitRunAnchor(nextAnchor);
    };

    // Resizing in place is not a navigation: only a re-chunk that lands the
    // Learner on a different page moves focus and the viewport.
    if (nextPageIndex === pageIndex) {
      applyResize();

      return;
    }

    commitNavigation(applyResize, nextAnchor);
  }

  function goToPage(pageNumber: number) {
    const nextPage = pages[pageNumber - 1];
    const anchor = nextPage === undefined ? undefined : firstQuestionIdOnPage(nextPage);

    commitNavigation(() => {
      setPageIndex(pageNumber - 1);

      if (anchor !== undefined) {
        setActiveQuestionId(anchor);
        emitRunAnchor(anchor);
      }
    }, anchor);
  }

  function showSummary() {
    commitNavigation(() => {
      setView("summary");
      emitSummary();
    });
  }

  function reviewQuestion(questionId: string) {
    const page = pages.find(({ questions }) =>
      questions.some(({ question }) => question.id === questionId),
    );

    commitNavigation(() => {
      setPageIndex(page?.index ?? 0);
      setActiveQuestionId(questionId);
      setView("questions");
      emitRunAnchor(questionId);
    }, questionId);
  }

  function retake() {
    void (async () => {
      setActionError(undefined);
      try {
        await resetRun(source, quiz.id);
        const anchor = quiz.questions[0]?.id;

        commitNavigation(() => {
          setAnswers({});
          setPageIndex(0);
          setActiveQuestionId(anchor);
          setView("questions");
          emitRunAnchor(anchor);
        }, anchor);
      } catch (error) {
        setActionError(messageFromError(error));
      }
    })();
  }

  const status = resolveStatus(isLoaded, loadError);

  return {
    status,
    view,
    error: loadError ?? actionError,
    answers: answers ?? {},
    pages,
    currentPage,
    pageSize,
    submitted: answers === undefined ? 0 : countSubmitted(quiz, answers),
    complete: answers === undefined ? false : isRunComplete(quiz, answers),
    optionOrderByQuestionId,
    headingRef,
    onSubmit,
    changePageSize,
    goToPage,
    showSummary,
    reviewQuestion,
    retake,
  };
}

/**
 * A load failure replaces the screen; an action failure (submit/retake) is
 * inline and recoverable, so the player stays mounted and reports `ready`.
 */
function resolveStatus(isLoaded: boolean, loadError: string | undefined): PlayerModel["status"] {
  if (isLoaded) return "ready";
  if (loadError !== undefined) return "load-error";

  return "loading";
}
