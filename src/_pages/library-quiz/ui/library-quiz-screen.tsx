import { QuizDetailView } from "@/features/quiz-detail";

import { renderPlayer } from "../lib/render-player";

/**
 * Quiz screen for the Library route `/library/quiz/?id={id}` (PRD §4):
 * `QuizDetailView` resolves the quiz from IndexedDB by query param, then hosts
 * the detail surface and — on the same route, without navigating — the Player.
 */
export function LibraryQuizScreen() {
  return <QuizDetailView renderPlayer={renderPlayer} />;
}
