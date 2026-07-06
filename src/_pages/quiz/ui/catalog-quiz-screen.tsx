import type { Quiz } from "@/shared/lib/quiz";
import { withBase } from "@/shared/lib/routing";

import { QuizDetail } from "@/features/quiz-detail";

import { renderPlayer } from "../lib/render-player";

interface CatalogQuizScreenProps {
  /** Serialized into the island at build time — no runtime fetch. */
  quiz: Quiz;
}

/**
 * Quiz screen for the static Catalog route `/quizzes/{id}/`: the same detail +
 * player pair as the Library, but the quiz is injected from build-time props
 * and Runs use the "catalog" namespace — so a same-id private copy imported into
 * the Library tracks its Progress independently of the public quiz.
 */
export function CatalogQuizScreen({ quiz }: CatalogQuizScreenProps) {
  return (
    <QuizDetail
      quiz={quiz}
      source="catalog"
      backHref={withBase("quizzes/")}
      backLabel="Back to the Catalog"
      renderPlayer={renderPlayer}
    />
  );
}
