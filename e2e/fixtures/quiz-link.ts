import type { Page } from "@playwright/test";

import type { Quiz } from "../../src/shared/lib/quiz";
import { encodeQuizLink, QUIZ_LINK_PARAM } from "../../src/shared/lib/quiz-link";

/** The Import path with a Quiz link fragment, built by the same encoder the site decodes with. */
export async function quizLinkPath(quiz: Quiz): Promise<string> {
  return `/import/#${QUIZ_LINK_PARAM}=${await encodeQuizLink(JSON.stringify(quiz))}`;
}

/**
 * Sets the Import textarea without `locator.fill`, which hangs for minutes on
 * large text even in a bare textarea. Goes through the native setter so React's
 * controlled input sees the change.
 */
export async function pasteQuizJson(page: Page, quiz: Quiz): Promise<void> {
  await page.evaluate(
    (json) => {
      const textarea = document.querySelector<HTMLTextAreaElement>("#quiz-json");

      if (textarea === null) throw new Error("Import textarea not found.");

      const setValue = Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype, "value")?.set;

      setValue?.call(textarea, json);
      textarea.dispatchEvent(new Event("input", { bubbles: true }));
    },
    JSON.stringify(quiz, null, 2),
  );
}
