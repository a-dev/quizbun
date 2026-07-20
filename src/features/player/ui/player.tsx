import type { Quiz } from "@/shared/lib/quiz";
import type { PlayerUrlState } from "@/shared/lib/routing";
import type { RunSource } from "@/shared/lib/storage";
import { TopLineLoader } from "@/shared/ui/loader";
import { Note } from "@/shared/ui/note";

import { usePlayer } from "../model/use-player";
import type { View } from "../model/use-player";
import { PlayerFrame } from "./player-frame";
import { QuestionsView } from "./questions-view";
import { Summary } from "./summary";

interface PlayerProps {
  /** Injected by the hosting surface: IndexedDB (Library) or build-time props (Catalog). */
  quiz: Quiz;
  /** Run namespace the player reads and writes. */
  source: RunSource;
  /** Initial view requested by the route URL. */
  urlView?: View;
  /** Question anchor requested by the route URL. */
  urlQuestionId?: string;
  /** Emits durable route state: mode plus Question anchor, never raw page. */
  onUrlStateChange?: (state: PlayerUrlState) => void;
  /** Returns to the detail surface — in-page state, same route (PRD §5). */
  onExit: () => void;
}

/**
 * Run player: thin shell over `usePlayer`. All loading, navigation, and
 * persistence live in the hook; this component only chooses which screen to
 * render and wires handlers through.
 */
export function Player({
  quiz,
  source,
  urlView = "questions",
  urlQuestionId,
  onUrlStateChange,
  onExit,
}: PlayerProps) {
  const player = usePlayer({ quiz, source, urlView, urlQuestionId, onUrlStateChange });

  if (player.status === "load-error") {
    return <Note type="error">Could not load the Run: {player.error}</Note>;
  }

  if (player.status === "loading" || player.currentPage === undefined) {
    // The full frame, not a bare loader: the detail → player view transition
    // captures this state as its "after" frame, so the title must already be
    // in place for the morph to connect (and the header appearing instantly
    // reads faster regardless).
    return (
      <PlayerFrame quiz={quiz} headingRef={player.headingRef} onExit={onExit}>
        <TopLineLoader />
      </PlayerFrame>
    );
  }

  if (player.view === "summary") {
    return (
      <Summary
        quiz={quiz}
        answers={player.answers}
        headingRef={player.headingRef}
        onReviewQuestion={player.reviewQuestion}
        onRetake={player.retake}
        onBack={onExit}
      />
    );
  }

  return (
    <QuestionsView
      quiz={quiz}
      pages={player.pages}
      currentPage={player.currentPage}
      pageSize={player.pageSize}
      submitted={player.submitted}
      complete={player.complete}
      optionOrderByQuestionId={player.optionOrderByQuestionId}
      error={player.error}
      headingRef={player.headingRef}
      onSubmit={player.onSubmit}
      onChangePageSize={player.changePageSize}
      onGoToPage={player.goToPage}
      onFinish={player.showSummary}
      onExit={onExit}
    />
  );
}
