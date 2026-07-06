import { useEffect, useState } from "react";

import type { PublicQuizSummary } from "@/shared/lib/content";
import { listQuizzes, listUnfinishedRuns } from "@/shared/lib/storage";

import { resolveContinueRuns, type ContinueRunDisplay } from "./continue-runs-model";

/** Cap on the number of unfinished Runs the rail surfaces at once. */
const MAX_CONTINUE_RUNS = 6;

/**
 * Reads the visitor's unfinished Runs from IndexedDB on mount and resolves them
 * against the Catalog (build-time prop) and the Library (IndexedDB).
 *
 * Returns an empty array both while the read is in flight and when there is
 * nothing to resume, so the caller renders no rail in either case — the section
 * never flashes empty on a first visit.
 *
 * IndexedDB is an external system, and a one-shot read on mount is exactly what
 * an Effect is for. Isolating it here keeps `ContinueRuns` a pure function of
 * its resolved data and matches the load pattern used across the app's islands.
 */
export function useContinueRuns(catalogSummaries: PublicQuizSummary[]): ContinueRunDisplay[] {
  const [continueRuns, setContinueRuns] = useState<ContinueRunDisplay[]>([]);

  useEffect(() => {
    let isActive = true;

    async function load() {
      try {
        // The Runs and Library stores are independent, so read them concurrently.
        const [runs, librarySummaries] = await Promise.all([listUnfinishedRuns(), listQuizzes()]);

        if (!isActive) return;

        setContinueRuns(
          resolveContinueRuns({
            runs,
            catalogSummaries,
            librarySummaries,
            limit: MAX_CONTINUE_RUNS,
          }),
        );
      } catch {
        // A failed IndexedDB read is non-fatal for a "nice to have" rail: show none.
        if (isActive) setContinueRuns([]);
      }
    }

    void load();

    return () => {
      isActive = false;
    };
  }, [catalogSummaries]);

  return continueRuns;
}
