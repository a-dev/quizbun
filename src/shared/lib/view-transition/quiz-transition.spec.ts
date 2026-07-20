import { describe, expect, test } from "vitest";

import { quizTransitionStyle } from "./quiz-transition";
import { withViewTransition } from "./with-view-transition";

describe("quizTransitionStyle", () => {
  test("uses ident-safe ids verbatim, prefixed by the part", () => {
    expect(quizTransitionStyle("title", "css-layout")).toEqual({
      viewTransitionName: "quiz-title-css-layout",
    });
    expect(quizTransitionStyle("progress", "a_b-2")).toEqual({
      viewTransitionName: "quiz-progress-a_b-2",
    });
  });

  test("sanitizes unsafe characters and appends a disambiguating hash", () => {
    const name = quizTransitionStyle("tags", "my quiz!").viewTransitionName;

    expect(name).toMatch(/^quiz-tags-my_quiz_-[a-z0-9]+$/);
  });

  test("two ids that sanitize identically still get distinct names", () => {
    const a = quizTransitionStyle("count", "a b").viewTransitionName;
    const b = quizTransitionStyle("count", "a?b").viewTransitionName;

    expect(a).not.toBe(b);
  });

  test("same id and part always produce the same name", () => {
    expect(quizTransitionStyle("title", "тест").viewTransitionName).toBe(
      quizTransitionStyle("title", "тест").viewTransitionName,
    );
  });

  test("an empty id still yields a valid, prefixed name", () => {
    expect(quizTransitionStyle("title", "").viewTransitionName).toMatch(/^quiz-title--[a-z0-9]+$/);
  });
});

describe("withViewTransition", () => {
  test("applies the update directly when no DOM is available", () => {
    let applied = false;

    withViewTransition(() => {
      applied = true;
    });

    expect(applied).toBe(true);
  });
});
