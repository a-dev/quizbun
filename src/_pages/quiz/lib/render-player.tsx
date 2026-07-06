import type { ReactNode } from "react";

import { Player } from "@/features/player";
import type { QuizDetailProps } from "@/features/quiz-detail";

/**
 * `quiz-detail` and `player` are sibling features, so neither may import the
 * other (FSD forbids feature-to-feature imports); the page slice is the
 * composition point that hands the Player to `QuizDetail` through its
 * `renderPlayer` prop. Page slices may not import each other either, so this
 * glue is intentionally duplicated in both quiz-screen slices
 * (dev-docs/pages-layer-migration.md) — keep the copies in sync.
 *
 * The argument type is borrowed from `QuizDetailProps` so the two stay in lockstep:
 * if the detail feature changes what it passes to the player, this fails to compile.
 */
export function renderPlayer({
  quiz,
  source,
  urlView,
  urlQuestionId,
  onUrlStateChange,
  onExit,
}: Parameters<QuizDetailProps["renderPlayer"]>[0]): ReactNode {
  return (
    <Player
      quiz={quiz}
      source={source}
      urlView={urlView}
      urlQuestionId={urlQuestionId}
      onUrlStateChange={onUrlStateChange}
      onExit={onExit}
    />
  );
}
