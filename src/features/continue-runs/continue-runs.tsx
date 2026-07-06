import type { PublicQuizSummary } from "@/shared/lib/content";
import { withBase } from "@/shared/lib/routing";
import { SectionTitle } from "@/shared/ui/section-title";

import { QuizCard } from "@/entities/quiz";

import { useContinueRuns } from "./use-continue-runs";

import { layout } from "#styles";

interface ContinueRunsProps {
  /** The full public Catalog, serialized at build time, used to resolve Catalog Runs. */
  catalogSummaries: PublicQuizSummary[];
}

/**
 * "Continue learning" rail: the visitor's unfinished Runs as compact quiz cards.
 * Client-only (its data lives in IndexedDB) and self-hiding — it renders nothing
 * until there is at least one Run to resume.
 */
export function ContinueRuns({ catalogSummaries }: ContinueRunsProps) {
  const runs = useContinueRuns(catalogSummaries);

  if (runs.length === 0) return null;

  return (
    <section aria-labelledby="continue-learning" className={layout.section}>
      <SectionTitle title="Continue learning" />
      <div className={layout.quizCardGrid}>
        {runs.map((run) => (
          // A bare card: no tags or description, just the title and "N answered"
          // progress, so the visitor can pick up where they left off.
          <QuizCard
            key={run.key}
            summary={{
              id: run.key,
              title: run.title,
              tags: [],
              questionCount: run.total,
              answeredCount: run.answered,
            }}
            href={withBase(run.hrefPath)}
            size="s"
          />
        ))}
      </div>
    </section>
  );
}
