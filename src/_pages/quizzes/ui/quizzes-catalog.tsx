import { useDeferredValue, useEffect, useMemo, useState } from "react";

import type { PublicQuizSummary, TagCount } from "@/shared/lib/content";
import {
  clampPage,
  hasActiveListFilters,
  parseListUrlState,
  stringifyListUrlState,
  withBase,
} from "@/shared/lib/routing";
import type { ListUrlState } from "@/shared/lib/routing";
import { Button } from "@/shared/ui/button";
import { Note } from "@/shared/ui/note";
import { Pagination } from "@/shared/ui/pagination";

import { QuizCard } from "@/entities/quiz";

import { filterQuizItems, prepareFilterItems, TagFilter } from "@/features/filter-by-tags";

import { layout } from "#styles";

interface QuizzesCatalogProps {
  /** Serialized at build time from the content loader — no runtime fetch. */
  summaries: PublicQuizSummary[];
  tags: TagCount[];
  initialPage?: number;
  syncTagsToUrl?: boolean;
}

const QUIZZES_PER_PAGE = 12;

/**
 * The Catalog browser, shared by `/quizzes/` and the static `/quizzes/page/{n}/`
 * routes. The grid is prerendered at build time (the island server-renders the
 * initial page), and hydration layers on the interactive Tag filter, title
 * search, and URL synchronisation. Because filtering runs entirely client-side,
 * every route receives the full `summaries` list and re-derives the visible page.
 */
export function QuizzesCatalog({
  summaries,
  tags,
  initialPage = 1,
  syncTagsToUrl = true,
}: QuizzesCatalogProps) {
  const availableTags = useMemo(() => tags.map(({ tag }) => tag), [tags]);
  const tagCounts = useMemo(
    () => Object.fromEntries(tags.map(({ tag, count }) => [tag, count])),
    [tags],
  );
  const [urlState, setUrlState] = useState<ListUrlState>({
    selectedTags: [],
    tagMatchMode: "and",
    titleQuery: "",
    page: initialPage,
  });
  // Typing in the search box updates `titleQuery` synchronously (so the input
  // stays responsive) but defers the expensive re-filter to a low-priority
  // render, keeping keystrokes smooth on large catalogs.
  const deferredTitleQuery = useDeferredValue(urlState.titleQuery);
  const [hasReadUrl, setHasReadUrl] = useState(false);
  // Precompute normalised search fields once per catalog, not once per keystroke.
  const preparedSummaries = useMemo(() => prepareFilterItems(summaries), [summaries]);

  // The server-rendered HTML can't know the request URL, so the real filter
  // state is read from the address bar after hydration. `hasReadUrl` gates the
  // history writes below until this initial read has happened.
  useEffect(() => {
    if (!syncTagsToUrl) return;

    setUrlState(parseListUrlState(window.location.search, availableTags, readCatalogPathPage()));
    setHasReadUrl(true);
  }, [availableTags, syncTagsToUrl]);

  // Keep state in sync with browser Back/Forward, which change the URL without a
  // React update of their own.
  useEffect(() => {
    if (!syncTagsToUrl) return;
    if (!hasReadUrl) return;

    const onPopState = () => {
      setUrlState(parseListUrlState(window.location.search, availableTags, readCatalogPathPage()));
    };

    window.addEventListener("popstate", onPopState);

    return () => window.removeEventListener("popstate", onPopState);
  }, [availableTags, hasReadUrl, syncTagsToUrl]);

  const visibleQuizzes = useMemo(
    () =>
      filterQuizItems(preparedSummaries, {
        selectedTags: urlState.selectedTags,
        tagMatchMode: urlState.tagMatchMode,
        titleQuery: deferredTitleQuery,
      }),
    [deferredTitleQuery, preparedSummaries, urlState.selectedTags, urlState.tagMatchMode],
  );
  const pageCount = Math.ceil(visibleQuizzes.length / QUIZZES_PER_PAGE);
  const currentPage = clampPage(urlState.page, Math.max(pageCount, 1));
  const pagedQuizzes = visibleQuizzes.slice(
    (currentPage - 1) * QUIZZES_PER_PAGE,
    currentPage * QUIZZES_PER_PAGE,
  );

  // If filtering shrinks the result set below the active page, snap back into
  // range and rewrite (not push) the URL so Back doesn't return to an empty page.
  useEffect(() => {
    if (urlState.page === currentPage) return;

    setUrlState((state) => {
      const nextState = { ...state, page: currentPage };
      replaceUrl(nextState);

      return nextState;
    });
  }, [currentPage, urlState.page]);

  // History strategy: filter and clamp changes `replaceState` (they refine the
  // current view and shouldn't stack Back entries); explicit page navigation
  // `pushState` (so Back returns to the previous page).
  function replaceUrl(nextState: ListUrlState) {
    if (!syncTagsToUrl || !hasReadUrl) return;

    window.history.replaceState(window.history.state, "", catalogUrlForState(nextState));
  }

  function pushUrl(nextState: ListUrlState) {
    if (!syncTagsToUrl || !hasReadUrl) return;

    window.history.pushState(window.history.state, "", catalogUrlForState(nextState));
  }

  // Two URL shapes: a filtered view is a query string on `/quizzes/`, while an
  // unfiltered view uses the canonical static `/quizzes/page/{n}/` path that also
  // exists as a prerendered route (shareable, crawlable, no JS required).
  function catalogUrlForState(nextState: ListUrlState): string {
    if (hasActiveListFilters(nextState)) {
      return `${withBase("quizzes/")}${stringifyListUrlState(nextState, availableTags)}`;
    }

    return catalogPageHref(nextState.page);
  }

  // Any filter edit resets to page 1: the old page number rarely makes sense
  // against a freshly filtered, shorter result set.
  function updateFilters(nextFilters: Partial<Omit<ListUrlState, "page">>) {
    setUrlState((state) => {
      const nextState = { ...state, ...nextFilters, page: 1 };
      replaceUrl(nextState);

      return nextState;
    });
  }

  function changePage(nextPage: number) {
    setUrlState((state) => {
      const nextState = { ...state, page: nextPage };
      pushUrl(nextState);

      return nextState;
    });
  }

  function catalogPageHref(page: number): string {
    return page <= 1 ? withBase("quizzes/") : withBase(`quizzes/page/${page}/`);
  }

  function clearFilters() {
    updateFilters({
      selectedTags: [],
      tagMatchMode: "and",
      titleQuery: "",
    });
  }

  if (summaries.length === 0) {
    return <p>No public quizzes yet — the first seed quizzes are on their way.</p>;
  }

  return (
    <>
      <TagFilter
        availableTags={availableTags}
        selectedTags={urlState.selectedTags}
        onSelectedTagsChange={(selectedTags) => updateFilters({ selectedTags })}
        tagMatchMode={urlState.tagMatchMode}
        onTagMatchModeChange={(tagMatchMode) => updateFilters({ tagMatchMode })}
        titleQuery={urlState.titleQuery}
        onTitleQueryChange={(titleQuery) => updateFilters({ titleQuery })}
        tagCounts={tagCounts}
      />

      {visibleQuizzes.length === 0 ? (
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
            {pagedQuizzes.map((summary) => (
              <QuizCard
                key={summary.id}
                summary={summary}
                href={withBase(`quizzes/${encodeURIComponent(summary.id)}/`)}
                showDescription
              />
            ))}
          </div>
          <Pagination
            aria-label="Catalog pages"
            currentPage={currentPage}
            pageCount={pageCount}
            hrefForPage={(page) => catalogUrlForState({ ...urlState, page })}
            onPageChange={changePage}
          />
        </>
      )}
    </>
  );
}

// The unfiltered page number lives in the path (`/quizzes/page/{n}/`), not the
// query, so it has to be recovered from the pathname when seeding/syncing state.
function readCatalogPathPage(): number {
  const match = window.location.pathname.match(/\/quizzes\/page\/(\d+)\/?$/);
  const page = match?.[1] === undefined ? 1 : Number(match[1]);

  return Number.isSafeInteger(page) && page > 0 ? page : 1;
}
