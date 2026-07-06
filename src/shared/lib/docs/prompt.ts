/**
 * Extracts the copyable prompt text from `docs/quiz-generation-prompt.md`.
 *
 * The "Copy prompt" action must copy the prompt **source text** — everything
 * under the `## Prompt` heading, including the embedded JSON Schema and the
 * canonical example — never the rendered HTML (T3.2).
 */

const PROMPT_HEADING = "## Prompt";

export function extractPromptText(promptDocSource: string): string {
  const headingIndex = promptDocSource.indexOf(`${PROMPT_HEADING}\n`);

  if (headingIndex === -1) {
    throw new Error(
      `The AI prompt document has no "${PROMPT_HEADING}" heading; the copyable prompt cannot be extracted.`,
    );
  }

  return promptDocSource.slice(headingIndex + PROMPT_HEADING.length).trim();
}
