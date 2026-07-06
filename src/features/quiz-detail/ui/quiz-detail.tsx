import type { ReactNode } from "react";
import { useCallback, useRef, useState } from "react";

import type { Quiz } from "@/shared/lib/quiz";
import type { PlayerUrlState } from "@/shared/lib/routing";
import type { RunSource } from "@/shared/lib/storage";
import { BackButton } from "@/shared/ui/breadcrumbs";
import { TopLineLoader } from "@/shared/ui/loader";
import { Note } from "@/shared/ui/note";

import { playerViewFromState } from "../model/player-route";
import type { PlayerView } from "../model/player-route";
import { usePlayerRoute } from "../model/use-player-route";
import { useRunStatus } from "../model/use-run-status";
import { DetailActions } from "./detail-actions";
import { QuizDetailHeader } from "./quiz-detail-header";
import { ResetProgressDialog } from "./reset-progress-dialog";

import { layout } from "#styles";

export interface QuizDetailProps {
  /** Injected by the hosting surface: IndexedDB (Library) or build-time props (Catalog). */
  quiz: Quiz;
  /** Run namespace: a public quiz and a same-id private copy track Progress independently. */
  source: RunSource;
  backHref: string;
  backLabel: string;
  /**
   * Injected by the hosting page (FSD: features must not import each other).
   * Receives the quiz, its Run namespace, and an exit callback back to detail.
   */
  renderPlayer: (props: {
    quiz: Quiz;
    source: RunSource;
    urlView: PlayerView;
    urlQuestionId?: string;
    onUrlStateChange: (state: PlayerUrlState) => void;
    onExit: () => void;
  }) => ReactNode;
}

/**
 * Source-agnostic detail surface for a single quiz. The two surfaces (detail
 * and the injected player) share one route (PRD §5): `usePlayerRoute` derives
 * which to show from the URL, so activating the primary action never navigates.
 */
export function QuizDetail({ quiz, source, backHref, backLabel, renderPlayer }: QuizDetailProps) {
  const { state, surface, enter, exit, replace } = usePlayerRoute(quiz);
  const { status, error, refresh, reset } = useRunStatus(source, quiz);
  const [resetDialogOpen, setResetDialogOpen] = useState(false);

  // The player unmounts on exit, taking the focused control with it. Focus the
  // detail article as it remounts on return, instead of letting focus drop to
  // <body> (T7.1). A ref callback fires exactly on that remount — no effect
  // needed; `returnedFromPlayer` keeps the initial visit from stealing focus.
  const returnedFromPlayer = useRef(false);
  const focusArticleOnReturn = useCallback((node: HTMLElement | null) => {
    if (node !== null && returnedFromPlayer.current) {
      returnedFromPlayer.current = false;
      node.focus();
    }
  }, []);

  const handleExit = useCallback(() => {
    returnedFromPlayer.current = true;
    exit();
    // Returning may have changed progress; refresh the header's "X of Y".
    void refresh();
  }, [exit, refresh]);

  const handleRetake = useCallback(() => {
    void (async () => {
      // Retake replaces the Run, then drops straight back into the questions.
      if (await reset()) enter("questions");
    })();
  }, [reset, enter]);

  const requestReset = useCallback(() => setResetDialogOpen(true), []);

  const confirmReset = useCallback(() => {
    setResetDialogOpen(false);
    void reset();
  }, [reset]);

  if (surface === "player") {
    // The injected player swaps in here; the swap stays on this route (PRD §5).
    return renderPlayer({
      quiz,
      source,
      urlView: playerViewFromState(state),
      urlQuestionId: state.questionId,
      onUrlStateChange: replace,
      onExit: handleExit,
    });
  }

  return (
    <article
      aria-labelledby="quiz-detail-title"
      tabIndex={-1}
      ref={focusArticleOnReturn}
      className={layout.page}
    >
      <BackButton href={backHref} text={backLabel} />
      <QuizDetailHeader quiz={quiz} runStatus={status} />

      {error !== undefined && <Note type="error">{error}</Note>}

      {status === undefined ? (
        <TopLineLoader />
      ) : (
        <DetailActions
          runStatus={status}
          onPlay={enter}
          onRetake={handleRetake}
          onResetRequest={requestReset}
        />
      )}

      <ResetProgressDialog
        open={resetDialogOpen}
        onOpenChange={setResetDialogOpen}
        quizTitle={quiz.title}
        onConfirm={confirmReset}
      />
    </article>
  );
}
