import { useCallback, useEffect, useState } from "react";

import { messageFromError } from "@/shared/lib/errors";
import type { Quiz } from "@/shared/lib/quiz";
import { getRunStatus, reconcileRunWithQuiz, resetRun } from "@/shared/lib/storage";
import type { RunSource, RunStatus } from "@/shared/lib/storage";

export interface RunStatusController {
  /** `undefined` until the first load resolves — render a loading state meanwhile. */
  status: RunStatus | undefined;
  /** Last load or mutation error, if any. */
  error: string | undefined;
  /** Re-read the Run from storage (e.g. after returning from the player). */
  refresh: () => Promise<void>;
  /** Drop the saved Run, then refresh. Resolves `false` if storage threw. */
  reset: () => Promise<boolean>;
}

/**
 * Owns the detail surface's view of the Run: its status plus reset/refresh.
 *
 * Catalog quizzes reconcile against current content on every visit — a deployed
 * quiz changes via PR with no re-import step on the visitor's device, so
 * Content-hash invalidation has to run on load. Library quizzes already
 * reconcile at import time (`replaceQuiz`), so they skip it here.
 */
export function useRunStatus(source: RunSource, quiz: Quiz): RunStatusController {
  const [status, setStatus] = useState<RunStatus | undefined>(undefined);
  const [error, setError] = useState<string | undefined>(undefined);

  useEffect(() => {
    let cancelled = false;

    void (async () => {
      try {
        if (source === "catalog") await reconcileRunWithQuiz(source, quiz);

        const next = await getRunStatus(source, quiz);
        if (!cancelled) setStatus(next);
      } catch (loadError) {
        if (!cancelled) setError(messageFromError(loadError));
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [quiz, source]);

  const refresh = useCallback(async () => {
    try {
      setStatus(await getRunStatus(source, quiz));
    } catch (refreshError) {
      setError(messageFromError(refreshError));
    }
  }, [quiz, source]);

  const reset = useCallback(async (): Promise<boolean> => {
    setError(undefined);

    try {
      // Reset progress and Retake share this: replace the Run, no archive.
      await resetRun(source, quiz.id);
      setStatus(await getRunStatus(source, quiz));
      return true;
    } catch (resetError) {
      setError(messageFromError(resetError));
      return false;
    }
  }, [quiz, source]);

  return { status, error, refresh, reset };
}
