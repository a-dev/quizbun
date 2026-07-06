import { describe, expect, test } from "vitest";

import { parsePlayerUrlState, updatePlayerUrlSearch } from "./player-url-state";

const questionIds = ["q1", "q2"] as const;

describe("parsePlayerUrlState", () => {
  test("reads run mode and a known Question id", () => {
    expect(parsePlayerUrlState("?id=quiz&mode=run&question=q2", questionIds)).toEqual({
      mode: "run",
      questionId: "q2",
    });
  });

  test("drops unknown Question ids", () => {
    expect(parsePlayerUrlState("?mode=run&question=gone", questionIds)).toEqual({
      mode: "run",
      questionId: undefined,
    });
  });

  test("reads summary mode without a Question id", () => {
    expect(parsePlayerUrlState("?mode=summary&question=q2", questionIds)).toEqual({
      mode: "summary",
      questionId: undefined,
    });
  });
});

describe("updatePlayerUrlSearch", () => {
  test("preserves unrelated params such as Library quiz id", () => {
    expect(updatePlayerUrlSearch("?id=quiz", { mode: "run", questionId: "q1" })).toBe(
      "?id=quiz&mode=run&question=q1",
    );
  });

  test("clears player params when returning to detail mode", () => {
    expect(updatePlayerUrlSearch("?id=quiz&mode=run&question=q1", { mode: "detail" })).toBe(
      "?id=quiz",
    );
  });
});
