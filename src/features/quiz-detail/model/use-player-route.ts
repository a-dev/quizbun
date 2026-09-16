import { useCallback, useMemo, useSyncExternalStore } from "react";

import type { Quiz } from "@/shared/lib/quiz";
import { parsePlayerUrlState, questionAnchorId, updatePlayerUrlSearch } from "@/shared/lib/routing";
import type { PlayerUrlState } from "@/shared/lib/routing";
import { DEFAULT_PAGE_SIZE, getPageSize, subscribePageSize } from "@/shared/lib/storage";
import type { PageSize } from "@/shared/lib/storage";

import { questionLinkNeedsAnchor } from "../lib/question-link";
import { surfaceFromState } from "./player-route";
import type { PlayerView, Surface } from "./player-route";

/**
 * The browser URL is an external store the React tree subscribes to. Back and
 * forward fire `popstate`; our own `pushState`/`replaceState` do not, so those
 * notify listeners explicitly (`emit`). Reading the URL through
 * `useSyncExternalStore` — rather than an effect that mirrors it into state —
 * gives a correct server snapshot: the island server-renders with no location,
 * so SSR resolves to the "detail" surface and client hydration matches.
 */
const listeners = new Set<() => void>();

function subscribe(onStoreChange: () => void): () => void {
  listeners.add(onStoreChange);
  window.addEventListener("popstate", onStoreChange);

  return () => {
    listeners.delete(onStoreChange);
    window.removeEventListener("popstate", onStoreChange);
  };
}

/** The raw query string — a stable primitive, so React's snapshot check never loops. */
function getSearchSnapshot(): string {
  return window.location.search;
}

/** No URL on the server; SSR and the first hydration render resolve to "detail". */
function getServerSearchSnapshot(): string {
  return "";
}

function writeHistory(
  method: "push" | "replace",
  state: PlayerUrlState,
  quiz: Quiz,
  pageSize: PageSize,
): void {
  const search = updatePlayerUrlSearch(window.location.search, state);
  const hash =
    state.mode === "run" &&
    state.questionId !== undefined &&
    questionLinkNeedsAnchor(quiz, state.questionId, pageSize)
      ? `#${questionAnchorId(state.questionId)}`
      : "";
  const url = `${window.location.pathname}${search}${hash}`;

  if (method === "push") {
    window.history.pushState(window.history.state, "", url);
  } else {
    window.history.replaceState(window.history.state, "", url);
  }

  // History writes don't emit `popstate`; nudge subscribers to re-read the URL.
  for (const onStoreChange of listeners) onStoreChange();
}

export interface PlayerRoute {
  /** Parsed URL state: player mode plus an optional Question anchor. */
  state: PlayerUrlState;
  /** Which surface to show, derived from `state`. */
  surface: Surface;
  /** Enter the player and push history — a new back-stack entry, so Back returns to detail. */
  enter: (view: PlayerView, questionId?: string) => void;
  /** Crawlable href for opening the player at its first unsubmitted Question. */
  startHref: string;
  /** Crawlable href for opening one Question in the player. */
  questionHref: (questionId: string) => string;
  /** Return to detail, replacing history — no extra back-stack entry. */
  exit: () => void;
  /** Mirror a player-driven state change into the URL, replacing history. */
  replace: (state: PlayerUrlState, pageSize?: PageSize) => void;
}

export function usePlayerRoute(quiz: Quiz): PlayerRoute {
  const search = useSyncExternalStore(subscribe, getSearchSnapshot, getServerSearchSnapshot);
  // The detail list is SSR-visible, so use the shared default for its server
  // snapshot and reconcile the browser-only preference during hydration.
  const pageSize = useSyncExternalStore(subscribePageSize, getPageSize, () => DEFAULT_PAGE_SIZE);

  // Re-parse only when the URL or the quiz's Question set changes. The ids gate
  // the `question` anchor: an anchor that no longer exists resolves to none.
  const questionIds = useMemo(() => quiz.questions.map((question) => question.id), [quiz]);
  const state = useMemo(() => parsePlayerUrlState(search, questionIds), [search, questionIds]);

  const enter = useCallback(
    (view: PlayerView, questionId?: string) => {
      writeHistory(
        "push",
        {
          mode: view === "summary" ? "summary" : "run",
          ...(view === "questions" && questionId !== undefined && { questionId }),
        },
        quiz,
        pageSize,
      );
    },
    [quiz, pageSize],
  );

  const startHref = useMemo(() => updatePlayerUrlSearch(search, { mode: "run" }), [search]);

  const questionHref = useCallback(
    (questionId: string) => {
      const href = updatePlayerUrlSearch(search, { mode: "run", questionId });

      return questionLinkNeedsAnchor(quiz, questionId, pageSize)
        ? `${href}#${questionAnchorId(questionId)}`
        : href;
    },
    [search, quiz, pageSize],
  );

  const exit = useCallback(() => {
    writeHistory("replace", { mode: "detail" }, quiz, pageSize);
  }, [quiz, pageSize]);

  const replace = useCallback(
    (next: PlayerUrlState, playerPageSize = pageSize) => {
      writeHistory("replace", next, quiz, playerPageSize);
    },
    [quiz, pageSize],
  );

  return { state, surface: surfaceFromState(state), enter, startHref, questionHref, exit, replace };
}
