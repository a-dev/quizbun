/**
 * Parses raw quiz text into untyped JSON, turning a `JSON.parse` failure into
 * the same path-precise, copy-back-into-AI report the rest of the Standard
 * produces. Kept free of `node:fs` so it stays usable everywhere quiz text is
 * parsed — build-time validators (which pass `readFileSync(...)`) and any
 * future caller alike. Schema validation is the caller's job; this only covers
 * the "is it even JSON?" tier.
 */
export function parseQuizJson(rawText: string, sourceLabel: string): unknown {
  try {
    return JSON.parse(rawText);
  } catch (error) {
    // Only malformed JSON is reframed as an actionable report; anything else
    // (e.g. an I/O error from the caller's read) propagates unchanged.
    if (error instanceof SyntaxError) {
      throw new Error(
        [
          `JSON syntax error in ${sourceLabel}:`,
          "Path: `root`",
          `Problem: ${error.message}`,
          "Fix: Provide exactly one valid JSON object with no markdown fences, comments, or trailing commas.",
        ].join("\n"),
        { cause: error },
      );
    }

    throw error;
  }
}
