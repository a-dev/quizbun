/**
 * Shared-element view transitions for a quiz's identity (title, tags,
 * description, counters) as it travels across surfaces: Catalog/home card →
 * quiz page (cross-document navigation) and quiz detail → player (same-document
 * swap).
 *
 * Pairing is by `view-transition-name`: the same part of the same quiz gets
 * the same name on every surface, and the browser morphs matching names into
 * each other. Names must be valid CSS custom-idents and unique per document —
 * uniqueness comes from the quiz id (repo-wide-unique in the Catalog;
 * single-quiz documents elsewhere).
 *
 * `description` pairs the card's inline excerpt (first paragraph, capped) with
 * the header's full Markdown block: since the two differ in length, the browser
 * cross-fades the snapshots while the group animates the box, rather than
 * morphing glyph-for-glyph. `title`/`count` carry identical text and morph
 * cleanly.
 */
export type QuizTransitionPart = "title" | "tags" | "description" | "count" | "progress";

interface QuizTransitionStyle {
  viewTransitionName: string;
}

/**
 * Inline-style object that enrolls an element in the quiz's morph. Inline
 * because the name is per-quiz dynamic — it cannot live in a stylesheet class.
 */
export function quizTransitionStyle(part: QuizTransitionPart, quizId: string): QuizTransitionStyle {
  return { viewTransitionName: `quiz-${part}-${toCustomIdentChunk(quizId)}` };
}

/**
 * Quiz ids are author-controlled (a Library import accepts any string id), but
 * a `view-transition-name` must be a valid CSS custom-ident. Ids already made
 * of ident-safe characters pass through readably (`quiz-title-css-layout`);
 * any other id is sanitized, with a hash suffix so two different ids can never
 * collapse into the same name. The `quiz-<part>-` prefix guarantees a valid
 * ident start, so the chunk itself may safely begin with a digit or hyphen.
 */
function toCustomIdentChunk(id: string): string {
  if (/^[\w-]+$/.test(id)) return id;

  return `${id.replace(/[^\w-]/g, "_")}-${hashIdent(id)}`;
}

/** djb2-xor of the raw id in base36 — tiny, stable, and unique enough here. */
function hashIdent(value: string): string {
  let hash = 5381;
  for (let index = 0; index < value.length; index += 1) {
    hash = ((hash << 5) + hash) ^ value.charCodeAt(index);
  }

  return (hash >>> 0).toString(36);
}
