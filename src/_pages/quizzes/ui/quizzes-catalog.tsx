import { useDeferredValue, useEffect, useMemo, useState } from "react";

import type { PublicQuizSummary, TagCount } from "@/shared/lib/content";
import { useClientValue } from "@/shared/lib/hydration";
import {
  clampPage,
  hasActiveListFilters,
  parseListUrlState,
  QUIZZES_PER_PAGE,
  stringifyListUrlState,
  tagFilterHref,
  withBase,
} from "@/shared/lib/routing";
import type { ListUrlState } from "@/shared/lib/routing";
import { Pagination } from "@/shared/ui/pagination";

import { QuizCard } from "@/entities/quiz";

import {
  filterQuizItems,
  NoFilterMatches,
  prepareFilterItems,
  TagFilter,
} from "@/features/filter-by-tags";

import { layout } from "#styles";

interface QuizzesCatalogProps {
  /** Serialized at build time from the content loader — no runtime fetch. */
  summaries: PublicQuizSummary[];
  tags: TagCount[];
  initialPage?: number;
  syncTagsToUrl?: boolean;
}

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
  const [navigatedState, setNavigatedState] = useState<ListUrlState | undefined>(undefined);
  // The server-rendered HTML can't know the request URL, so the real filter
  // state comes from the address bar as soon as the client takes over. Derived
  // during render rather than written from an effect, so the server's empty
  // filters are never committed to the screen for a frame. `syncsUrl` also
  // gates the history writes below: before hydration there is nothing to sync.
  const syncsUrl = useClientValue(() => true, false) && syncTagsToUrl;
  const readUrlState = useMemo<ListUrlState>(
    () =>
      syncsUrl
        ? parseListUrlState(window.location.search, availableTags, readCatalogPathPage())
        : { selectedTags: [], tagMatchMode: "and", titleQuery: "", page: initialPage },
    [availableTags, initialPage, syncsUrl],
  );
  // Every later change — a filter edit, a page click, Back/Forward — writes the
  // URL and this state together, so the address bar never has to be re-read.
  const urlState = navigatedState ?? readUrlState;
  // Typing in the search box updates `titleQuery` synchronously (so the input
  // stays responsive) but defers the expensive re-filter to a low-priority
  // render, keeping keystrokes smooth on large catalogs.
  const deferredTitleQuery = useDeferredValue(urlState.titleQuery);
  // Precompute normalised search fields once per catalog, not once per keystroke.
  const preparedSummaries = useMemo(() => prepareFilterItems(summaries), [summaries]);

  // Keep state in sync with browser Back/Forward, which change the URL without a
  // React update of their own.
  useEffect(() => {
    if (!syncsUrl) return;

    const onPopState = () => {
      setNavigatedState(
        parseListUrlState(window.location.search, availableTags, readCatalogPathPage()),
      );
    };

    window.addEventListener("popstate", onPopState);

    return () => window.removeEventListener("popstate", onPopState);
  }, [availableTags, syncsUrl]);

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
  // A page number can arrive out of range (a deep link to `/quizzes/page/9/`
  // carrying filters that match one page), so the view always clamps. The URL
  // catches up on the next navigation, which writes the clamped state.
  const currentPage = clampPage(urlState.page, Math.max(pageCount, 1));
  const pagedQuizzes = visibleQuizzes.slice(
    (currentPage - 1) * QUIZZES_PER_PAGE,
    currentPage * QUIZZES_PER_PAGE,
  );

  /**
   * State and address bar move together. Filter changes `replaceState` (they
   * refine the current view and shouldn't stack Back entries); explicit page
   * navigation `pushState`, so Back returns to the previous page.
   */
  function applyState(nextState: ListUrlState, history: "push" | "replace") {
    setNavigatedState(nextState);

    if (!syncsUrl) return;

    const url = catalogUrlForState(nextState);

    if (history === "push") {
      window.history.pushState(window.history.state, "", url);
    } else {
      window.history.replaceState(window.history.state, "", url);
    }
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
    applyState({ ...urlState, ...nextFilters, page: 1 }, "replace");
  }

  function changePage(nextPage: number) {
    applyState({ ...urlState, page: nextPage }, "push");
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
        <NoFilterMatches onClearFilters={clearFilters} />
      ) : (
        <>
          <div className={layout.quizCardGrid}>
            {pagedQuizzes.map((summary) => (
              <QuizCard
                key={summary.id}
                summary={summary}
                href={withBase(`quizzes/${encodeURIComponent(summary.id)}/`)}
                tagHref={(tag) => tagFilterHref("quizzes/", tag)}
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
