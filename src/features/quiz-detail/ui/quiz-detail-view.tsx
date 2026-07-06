import { withBase } from "@/shared/lib/routing";
import { BackButton } from "@/shared/ui/breadcrumbs";
import { TopLineLoader } from "@/shared/ui/loader";
import { Note } from "@/shared/ui/note";

import { useStoredQuiz } from "../model/use-stored-quiz";
import { QuizDetail, type QuizDetailProps } from "./quiz-detail";

import { typography } from "#styles";

export interface QuizDetailViewProps {
  renderPlayer: QuizDetailProps["renderPlayer"];
}
/**
 * Library wrapper for `/library/quiz/?id={id}` (PRD §4): resolves the quiz
 * from IndexedDB by query param, then hosts the source-agnostic `QuizDetail`.
 * Catalog pages host the same component with build-time props instead.
 */
export function QuizDetailView({ renderPlayer }: QuizDetailViewProps) {
  const state = useStoredQuiz();

  if (state.status === "loading") return <TopLineLoader />;

  if (state.status === "error") {
    return <Note type="error">Could not load the quiz: {state.message}</Note>;
  }

  if (state.status === "not-found") {
    return (
      <section aria-labelledby="quiz-not-found-title">
        <BackButton href={withBase("library/")} text="Back to the Library" />
        <h1 id="quiz-not-found-title" className={typography.h1}>
          Quiz not found
        </h1>
        <Note type="error">
          {state.id === undefined
            ? "No quiz id was provided in the address."
            : `No quiz with id “${state.id}” is in your Library on this device. Private quizzes live in the browser, so a link only works where the quiz was imported.`}
        </Note>
      </section>
    );
  }

  return (
    <QuizDetail
      quiz={state.stored.quiz}
      source="library"
      backHref={withBase("library/")}
      backLabel="Back to the Library"
      renderPlayer={renderPlayer}
    />
  );
}
