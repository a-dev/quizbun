import { useEffect, useState } from "react";

import { messageFromError } from "@/shared/lib/errors";
import { getQuiz } from "@/shared/lib/storage";
import type { StoredQuiz } from "@/shared/lib/storage";

export type StoredQuizState =
  | { status: "loading" }
  | { status: "not-found"; id: string | undefined }
  | { status: "error"; message: string }
  | { status: "ready"; stored: StoredQuiz };

function readQuizId(): string | undefined {
  const id = new URLSearchParams(window.location.search).get("id");

  return id === null || id === "" ? undefined : id;
}

/**
 * Resolves the `?id={id}` quiz from IndexedDB for the Library detail route
 * (PRD §4). Client-only by nature — IndexedDB is per-device — so the lookup
 * runs after mount and the island server-renders the "loading" state. The id
 * is fixed for the page's lifetime, hence a mount-only (`[]`) effect.
 */
export function useStoredQuiz(): StoredQuizState {
  const [state, setState] = useState<StoredQuizState>({ status: "loading" });

  useEffect(() => {
    void (async () => {
      const id = readQuizId();

      if (id === undefined) {
        setState({ status: "not-found", id });
        return;
      }

      try {
        const stored = await getQuiz(id);

        setState(stored === undefined ? { status: "not-found", id } : { status: "ready", stored });
      } catch (error) {
        setState({ status: "error", message: messageFromError(error) });
      }
    })();
  }, []);

  return state;
}
