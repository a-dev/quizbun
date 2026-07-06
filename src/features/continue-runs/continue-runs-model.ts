import type { PublicQuizSummary } from "@/shared/lib/content";
import type { QuizSummary, Run, RunSource } from "@/shared/lib/storage";

/** The subset of a quiz summary the rail needs; Catalog and Library both satisfy it. */
type ContinueQuizSummary = Pick<PublicQuizSummary | QuizSummary, "id" | "title" | "questionCount">;

export interface ContinueRunDisplay {
  key: string;
  source: RunSource;
  title: string;
  hrefPath: string;
  answered: number;
  total: number;
}

interface ResolveContinueRunsInput {
  runs: readonly Run[];
  catalogSummaries: readonly PublicQuizSummary[];
  librarySummaries: readonly QuizSummary[];
  limit: number;
}

/**
 * Joins each unfinished Run to its quiz metadata so the rail can render a card.
 *
 * A Run only stores answers keyed by a quiz id; the title, question count, and
 * route come from the matching summary — Catalog Runs resolve against the
 * build-time Catalog, Library Runs against the in-browser Library. A Run whose
 * quiz no longer exists (Catalog quiz removed by a PR, Library quiz deleted) is
 * skipped, and resolution stops once `limit` cards are filled.
 */
export function resolveContinueRuns({
  runs,
  catalogSummaries,
  librarySummaries,
  limit,
}: ResolveContinueRunsInput): ContinueRunDisplay[] {
  // Index summaries lazily: a visitor with only Library Runs should never pay to
  // build a lookup over the entire public Catalog, which grows with the repo.
  let catalogById: Map<string, ContinueQuizSummary> | undefined;
  let libraryById: Map<string, ContinueQuizSummary> | undefined;

  const displayRuns: ContinueRunDisplay[] = [];

  for (const run of runs) {
    let summary: ContinueQuizSummary | undefined;
    if (run.source === "catalog") {
      catalogById ??= mapSummariesById(catalogSummaries);
      summary = catalogById.get(run.quizId);
    } else {
      libraryById ??= mapSummariesById(librarySummaries);
      summary = libraryById.get(run.quizId);
    }

    if (summary === undefined) continue;

    displayRuns.push({
      key: run.key,
      source: run.source,
      title: summary.title,
      hrefPath: runHrefPath(run.source, run.quizId),
      answered: Object.keys(run.answers).length,
      total: summary.questionCount,
    });

    if (displayRuns.length === limit) break;
  }

  return displayRuns;
}

/**
 * Catalog quizzes live at a static prerendered path; Library quizzes share a
 * single static shell addressed by query param (PRD §4). Ids are
 * percent-encoded because they may contain `/` or spaces.
 */
function runHrefPath(source: RunSource, quizId: string): string {
  return source === "catalog"
    ? `quizzes/${encodeURIComponent(quizId)}/`
    : `library/quiz/?id=${encodeURIComponent(quizId)}`;
}

function mapSummariesById(
  summaries: readonly ContinueQuizSummary[],
): Map<string, ContinueQuizSummary> {
  return new Map(summaries.map((summary) => [summary.id, summary]));
}
