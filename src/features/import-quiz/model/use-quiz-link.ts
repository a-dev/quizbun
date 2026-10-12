import { useEffect, useRef, useState } from "react";

import { decodeQuizLink, readQuizLinkFragment } from "@/shared/lib/quiz-link";

interface QuizLinkHandlers {
  onFailed: (report: string) => void;
  onLoaded: (json: string) => void;
}

/**
 * Opens a Quiz link from `location.hash`, once after hydration and again on
 * `hashchange`, so pasting a second link into the address bar also loads it.
 * The fragment is cleared before decoding (a large URL must not stay in
 * history, session restore, or a reload). Never saves anything.
 */
export function useQuizLink({ onFailed, onLoaded }: QuizLinkHandlers): { isOpening: boolean } {
  const [isOpening, setIsOpening] = useState(false);
  const handlersRef = useRef({ onFailed, onLoaded });
  const latestRequestRef = useRef(0);

  useEffect(() => {
    handlersRef.current = { onFailed, onLoaded };
  });

  useEffect(() => {
    async function openFromHash() {
      const payload = readQuizLinkFragment(window.location.hash);

      if (payload === undefined) return;

      window.history.replaceState(null, "", window.location.pathname + window.location.search);

      const request = latestRequestRef.current + 1;
      latestRequestRef.current = request;
      setIsOpening(true);

      const result = await decodeQuizLink(payload);

      // A newer link superseded this one while it was decoding.
      if (request !== latestRequestRef.current) return;

      setIsOpening(false);

      if (result.status === "decoded") {
        handlersRef.current.onLoaded(result.json);
      } else {
        handlersRef.current.onFailed(result.report);
      }
    }

    void openFromHash();
    window.addEventListener("hashchange", openFromHash);

    return () => window.removeEventListener("hashchange", openFromHash);
  }, []);

  return { isOpening };
}
