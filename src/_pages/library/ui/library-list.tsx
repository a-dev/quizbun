import { useDeferredValue, useEffect, useMemo, useState } from "react";

import { Trash2, Download, CirclePlus } from "lucide-react";

import { messageFromError } from "@/shared/lib/errors";
import { downloadQuizJson } from "@/shared/lib/quiz";
import { renderMarkdownFieldText } from "@/shared/lib/render";
import {
  clampPage,
  parseListUrlState,
  stringifyListUrlState,
  withBase,
} from "@/shared/lib/routing";
import type { ListUrlState } from "@/shared/lib/routing";
import { deleteQuiz, getQuiz, listQuizzes } from "@/shared/lib/storage";
import type { QuizSummary } from "@/shared/lib/storage";
import { Button, LinkAsButton } from "@/shared/ui/button";
import { Dialog } from "@/shared/ui/dialog";
import { TopLineLoader } from "@/shared/ui/loader";
import { Note } from "@/shared/ui/note";
import { Pagination } from "@/shared/ui/pagination";
import { SectionTitle } from "@/shared/ui/section-title";

import { QuizCard } from "@/entities/quiz";

import {
  collectTags,
  filterQuizItems,
  NoFilterMatches,
  prepareFilterItems,
  TagFilter,
} from "@/features/filter-by-tags";
import { StorageDurability } from "@/features/storage-durability";

import { layout } from "#styles";
import styles from "./library-list.module.css";

type LoadState =
  | { status: "loading" }
  | { status: "error"; message: string }
  | { status: "ready"; quizzes: QuizSummary[] };

const EMPTY_QUIZ_SUMMARIES: QuizSummary[] = [];
const QUIZZES_PER_PAGE = 12;

const INITIAL_URL_STATE: ListUrlState = {
  selectedTags: [],
  tagMatchMode: "and",
  titleQuery: "",
  page: 1,
};

/**
 * Pulls a page number back into range for the filters it travels with. The
 * render below clamps for display anyway; this clamps the value that reaches
 * state and the address bar, so Back never returns to a page with nothing on
 * it.
 */
function clampToResults(
  nextState: ListUrlState,
  preparedQuizzes: ReturnType<typeof prepareFilterItems>,
): ListUrlState {
  const matchCount = filterQuizItems(preparedQuizzes, {
    selectedTags: nextState.selectedTags,
    tagMatchMode: nextState.tagMatchMode,
    titleQuery: nextState.titleQuery,
  }).length;
  const page = clampPage(nextState.page, Math.max(Math.ceil(matchCount / QUIZZES_PER_PAGE), 1));

  return page === nextState.page ? nextState : { ...nextState, page };
}

export function LibraryList() {
  const [state, setState] = useState<LoadState>({ status: "loading" });
  const [urlState, setUrlState] = useState<ListUrlState>(INITIAL_URL_STATE);
  const deferredTitleQuery = useDeferredValue(urlState.titleQuery);
  const [hasReadUrl, setHasReadUrl] = useState(false);
  const [pendingDelete, setPendingDelete] = useState<QuizSummary | undefined>(undefined);
  const [actionError, setActionError] = useState<string | undefined>(undefined);
  const quizzes = state.status === "ready" ? state.quizzes : EMPTY_QUIZ_SUMMARIES;
  const availableTags = useMemo(() => collectTags(quizzes), [quizzes]);
  const preparedQuizzes = useMemo(() => prepareFilterItems(quizzes), [quizzes]);
  const visibleQuizzes = useMemo(
    () =>
      filterQuizItems(preparedQuizzes, {
        selectedTags: urlState.selectedTags,
        tagMatchMode: urlState.tagMatchMode,
        titleQuery: deferredTitleQuery,
      }),
    [deferredTitleQuery, preparedQuizzes, urlState.selectedTags, urlState.tagMatchMode],
  );
  const pageCount = Math.ceil(visibleQuizzes.length / QUIZZES_PER_PAGE);
  const currentPage = clampPage(urlState.page, Math.max(pageCount, 1));
  const pagedQuizzes = visibleQuizzes.slice(
    (currentPage - 1) * QUIZZES_PER_PAGE,
    currentPage * QUIZZES_PER_PAGE,
  );

  useEffect(() => {
    if (!hasReadUrl) return;

    const onPopState = () => {
      setUrlState(parseListUrlState(window.location.search, availableTags));
    };

    window.addEventListener("popstate", onPopState);

    return () => window.removeEventListener("popstate", onPopState);
  }, [availableTags, hasReadUrl]);

  async function refresh() {
    try {
      const loadedQuizzes = await listQuizzes();

      setState({ status: "ready", quizzes: loadedQuizzes });

      const loadedPrepared = prepareFilterItems(loadedQuizzes);

      if (hasReadUrl) {
        // A delete can drop the match count below the page being viewed.
        applyState(clampToResults(urlState, loadedPrepared), "replace");

        return;
      }

      // The server-rendered shell can't know the request URL, and the URL's Tag
      // slugs only resolve against the Tags that exist — so the first read has
      // to wait for the Library to load.
      const parsedState = parseListUrlState(window.location.search, collectTags(loadedQuizzes));
      const nextState = clampToResults(parsedState, loadedPrepared);

      setUrlState(nextState);
      setHasReadUrl(true);

      if (nextState.page !== parsedState.page) {
        window.history.replaceState(window.history.state, "", libraryUrlForState(nextState));
      }
    } catch (error) {
      setState({
        status: "error",
        message: messageFromError(error),
      });
    }
  }

  useEffect(() => {
    let cancelled = false;

    void listQuizzes()
      .then((loadedQuizzes) => {
        if (cancelled) return;

        setState({ status: "ready", quizzes: loadedQuizzes });

        // The server-rendered shell can't know the request URL, and the URL's Tag
        // slugs only resolve against the Tags that exist — so the first read has
        // to wait for the Library to load.
        const loadedPrepared = prepareFilterItems(loadedQuizzes);
        const parsedState = parseListUrlState(window.location.search, collectTags(loadedQuizzes));
        const nextState = clampToResults(parsedState, loadedPrepared);

        setUrlState(nextState);
        setHasReadUrl(true);

        if (nextState.page !== parsedState.page) {
          const href = `${withBase("library/")}${stringifyListUrlState(
            nextState,
            collectTags(loadedQuizzes),
          )}`;
          window.history.replaceState(window.history.state, "", href);
        }
      })
      .catch((error: unknown) => {
        if (!cancelled) setState({ status: "error", message: messageFromError(error) });
      });

    return () => {
      cancelled = true;
    };
  }, []);

  async function exportQuiz(id: string) {
    setActionError(undefined);

    try {
      const stored = await getQuiz(id);

      if (stored === undefined) {
        setActionError(`Quiz "${id}" is no longer in the Library.`);
        await refresh();
        return;
      }

      downloadQuizJson(stored.quiz);
    } catch (error) {
      setActionError(messageFromError(error));
    }
  }

  function requestDelete(summary: QuizSummary) {
    setActionError(undefined);
    setPendingDelete(summary);
  }

  async function confirmDelete() {
    if (pendingDelete === undefined) return;

    const target = pendingDelete;
    setPendingDelete(undefined);

    try {
      await deleteQuiz(target.id);
      await refresh();
    } catch (error) {
      setActionError(messageFromError(error));
    }
  }

  function clearFilters() {
    updateFilters({
      selectedTags: [],
      tagMatchMode: "and",
      titleQuery: "",
    });
  }

  function libraryUrlForState(nextState: ListUrlState): string {
    return `${withBase("library/")}${stringifyListUrlState(nextState, availableTags)}`;
  }

  /**
   * State and address bar move together. Filter changes `replaceState` (they
   * refine the current view and shouldn't stack Back entries); explicit page
   * navigation `pushState`, so Back returns to the previous page.
   */
  function applyState(nextState: ListUrlState, history: "push" | "replace") {
    setUrlState(nextState);

    if (!hasReadUrl) return;

    const url = libraryUrlForState(nextState);

    if (history === "push") {
      window.history.pushState(window.history.state, "", url);
    } else {
      window.history.replaceState(window.history.state, "", url);
    }
  }

  function updateFilters(nextFilters: Partial<Omit<ListUrlState, "page">>) {
    applyState({ ...urlState, ...nextFilters, page: 1 }, "replace");
  }

  function changePage(nextPage: number) {
    applyState({ ...urlState, page: nextPage }, "push");
  }

  if (state.status === "loading") return <TopLineLoader />;

  if (state.status === "error") {
    return <Note type="error">Could not load the Library: {state.message}</Note>;
  }

  const quizCountLabel = quizzes.length === 1 ? "quiz" : "quizzes";
  const counter = quizzes.length > 0 ? `${quizzes.length} ${quizCountLabel} available` : undefined;

  return (
    <section aria-label="Your quizzes" className={layout.section}>
      <SectionTitle title="My library" counter={counter} />
      <div className={styles.intro}>
        <div className={styles.introText}>
          <p>
            Here you can import quizzes you create. They stay on this device and browser. Read more
            about how <a href={withBase("docs/prompt/")}>generate quiz with your AI</a>.
          </p>
          <p className={styles.note}>
            * Your browser stores everything locally in IndexedDB. Clearing cookies won't erase your
            progress, but clearing site data or using private browsing will.
          </p>
        </div>
        <LinkAsButton variant="primary" size="m" href={withBase("import/")}>
          <CirclePlus aria-hidden="true" className={styles.icon} size={18} />
          Add new quiz
        </LinkAsButton>
      </div>
      {quizzes.length > 0 && <StorageDurability />}
      {state.quizzes.length !== 0 && (
        <TagFilter
          availableTags={availableTags}
          selectedTags={urlState.selectedTags}
          onSelectedTagsChange={(selectedTags) => updateFilters({ selectedTags })}
          tagMatchMode={urlState.tagMatchMode}
          onTagMatchModeChange={(tagMatchMode) => updateFilters({ tagMatchMode })}
          titleQuery={urlState.titleQuery}
          onTitleQueryChange={(titleQuery) => updateFilters({ titleQuery })}
        />
      )}

      {actionError !== undefined && <Note type="error">{actionError}</Note>}

      {visibleQuizzes.length === 0 && state.quizzes.length !== 0 ? (
        <NoFilterMatches onClearFilters={clearFilters} />
      ) : (
        <>
          <div className={layout.quizCardGrid}>
            {pagedQuizzes.map((summary) => {
              const titleText = renderMarkdownFieldText("quizTitle", summary.title);

              return (
                <QuizCard
                  key={summary.id}
                  summary={summary}
                  href={withBase(`library/quiz/?id=${encodeURIComponent(summary.id)}`)}
                  actions={
                    <div className={styles.actions}>
                      <Button
                        size="icon-s"
                        variant="outline"
                        aria-label={`Export ${titleText}`}
                        onClick={() => void exportQuiz(summary.id)}
                      >
                        <Download size="14" />
                      </Button>
                      <Button
                        size="icon-s"
                        variant="destructive"
                        aria-label={`Delete ${titleText}`}
                        onClick={() => requestDelete(summary)}
                      >
                        <Trash2 size="14" />
                      </Button>
                    </div>
                  }
                />
              );
            })}
          </div>
          <Pagination
            aria-label="Library pages"
            currentPage={currentPage}
            pageCount={pageCount}
            hrefForPage={(page) => libraryUrlForState({ ...urlState, page })}
            onPageChange={changePage}
          />
        </>
      )}

      {/* Closing via Cancel / overlay / Escape clears the pending target. */}
      <Dialog
        open={pendingDelete !== undefined}
        onOpenChange={(open) => {
          if (!open) setPendingDelete(undefined);
        }}
        title="Delete this quiz?"
        description={
          pendingDelete !== undefined ? (
            <>
              “{renderMarkdownFieldText("quizTitle", pendingDelete.title)}” and its saved progress
              will be removed from your Library. This cannot be undone.
            </>
          ) : undefined
        }
        footer={
          <>
            <Dialog.Close
              render={
                <Button variant="outline" size="m">
                  Cancel
                </Button>
              }
            />
            <Button variant="destructive" size="m" onClick={() => void confirmDelete()}>
              Delete
            </Button>
          </>
        }
      />
    </section>
  );
}
