import { useDeferredValue, useEffect, useMemo, useState } from "react";

import { Trash2, Download } from "lucide-react";

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
  prepareFilterItems,
  TagFilter,
} from "@/features/filter-by-tags";

import { layout } from "#styles";
import styles from "./library-list.module.css";

type LoadState =
  | { status: "loading" }
  | { status: "error"; message: string }
  | { status: "ready"; quizzes: QuizSummary[] };

const EMPTY_QUIZ_SUMMARIES: QuizSummary[] = [];
const QUIZZES_PER_PAGE = 12;

export function LibraryList() {
  const [state, setState] = useState<LoadState>({ status: "loading" });
  const [urlState, setUrlState] = useState<ListUrlState>({
    selectedTags: [],
    tagMatchMode: "and",
    titleQuery: "",
    page: 1,
  });
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
    if (state.status !== "ready" || hasReadUrl) return;

    setUrlState(parseListUrlState(window.location.search, availableTags));
    setHasReadUrl(true);
  }, [availableTags, hasReadUrl, state.status]);

  useEffect(() => {
    if (!hasReadUrl) return;

    const onPopState = () => {
      setUrlState(parseListUrlState(window.location.search, availableTags));
    };

    window.addEventListener("popstate", onPopState);

    return () => window.removeEventListener("popstate", onPopState);
  }, [availableTags, hasReadUrl]);

  useEffect(() => {
    if (!hasReadUrl || urlState.page === currentPage) return;

    setUrlState((previousState) => {
      const nextState = { ...previousState, page: currentPage };
      replaceUrl(nextState);

      return nextState;
    });
  }, [currentPage, hasReadUrl, urlState.page]);

  async function refresh() {
    try {
      setState({ status: "ready", quizzes: await listQuizzes() });
    } catch (error) {
      setState({
        status: "error",
        message: messageFromError(error),
      });
    }
  }

  useEffect(() => {
    void refresh();
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

  function replaceUrl(nextState: ListUrlState) {
    if (!hasReadUrl) return;

    window.history.replaceState(window.history.state, "", libraryUrlForState(nextState));
  }

  function pushUrl(nextState: ListUrlState) {
    if (!hasReadUrl) return;

    window.history.pushState(window.history.state, "", libraryUrlForState(nextState));
  }

  function updateFilters(nextFilters: Partial<Omit<ListUrlState, "page">>) {
    setUrlState((previousState) => {
      const nextState = { ...previousState, ...nextFilters, page: 1 };
      replaceUrl(nextState);

      return nextState;
    });
  }

  function changePage(nextPage: number) {
    setUrlState((previousState) => {
      const nextState = { ...previousState, page: nextPage };
      pushUrl(nextState);

      return nextState;
    });
  }

  if (state.status === "loading") return <TopLineLoader />;

  if (state.status === "error") {
    return <Note type="error">Could not load the Library: {state.message}</Note>;
  }

  return (
    <section aria-label="Your quizzes" className={layout.section}>
      <SectionTitle
        title="My library"
        counter={`${quizzes.length} ${quizzes.length === 1 ? "quiz" : "quizzes"} available`}
      />
      <div className={styles.intro}>
        <LinkAsButton variant="primary" size="m" href={withBase("import/")}>
          Add new quiz
        </LinkAsButton>
        <div className={styles.introText}>
          In this library you can save quizzes you create or import, and track your progress on
          them. Quizzes you add here are stored in your browser's IndexedDB and are only available
          on this device and browser — they won't be shared across browsers or devices, and won't be
          lost if you clear cookies but will be lost if you clear site data or use private browsing.
        </div>
      </div>

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
        <Note type="warning">
          <p>
            No quizzes match the selected filters.{" "}
            <Button variant="destructive" size="s" onClick={clearFilters}>
              Clear filters
            </Button>{" "}
            to see all quizzes.
          </p>
        </Note>
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
