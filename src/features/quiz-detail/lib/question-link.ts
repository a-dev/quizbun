import type { Quiz } from "@/shared/lib/quiz";
import type { PageSize } from "@/shared/lib/storage";

/** A page-opening link only needs a fragment when its Question is below the page's top. */
export function questionLinkNeedsAnchor(
  quiz: Quiz,
  questionId: string,
  pageSize: PageSize,
): boolean {
  const questionIndex = quiz.questions.findIndex((question) => question.id === questionId);

  return questionIndex >= 0 && questionIndex % pageSize !== 0;
}
