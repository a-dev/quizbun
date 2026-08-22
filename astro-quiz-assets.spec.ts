import { describe, expect, test } from "vitest";

import { parseAssetRequest } from "./astro-quiz-assets";

const QUIZ_ID = "undo-redo-back-stacks-queues";

describe("parseAssetRequest", () => {
  test("resolves a well-formed asset request at the site root", () => {
    expect(parseAssetRequest(`/quiz-assets/${QUIZ_ID}/undo-stack.svg`, "/")).toEqual({
      fileName: "undo-stack.svg",
      quizId: QUIZ_ID,
    });
  });

  test("ignores the query string", () => {
    expect(parseAssetRequest(`/quiz-assets/${QUIZ_ID}/undo-stack.svg?v=2`, "/")).toEqual({
      fileName: "undo-stack.svg",
      quizId: QUIZ_ID,
    });
  });

  test.each(["/quizbun", "/quizbun/"])("serves the asset route under base %s", (base) => {
    expect(parseAssetRequest(`/quizbun/quiz-assets/${QUIZ_ID}/undo-stack.svg`, base)).toEqual({
      fileName: "undo-stack.svg",
      quizId: QUIZ_ID,
    });
  });

  test.each([
    ["the site root", "/"],
    ["another route", "/quizzes/"],
    ["a route that merely shares the prefix", "/quiz-assets-other/a/b.svg"],
    // URL parsing resolves the traversal before the prefix test, so the request
    // leaves the asset route entirely rather than reaching the filesystem.
    ["a literal traversal segment", `/quiz-assets/${QUIZ_ID}/../../package.json`],
  ])("hands %s back to the next middleware", (_label, requestUrl) => {
    expect(parseAssetRequest(requestUrl, "/")).toBeUndefined();
  });

  // Both segments are validated after decoding, so an encoded separator cannot
  // smuggle a path out of the asset folder.
  test.each([
    ["percent-encoded traversal", `/quiz-assets/${QUIZ_ID}/%2e%2e%2f%2e%2e%2fpackage.json`],
    ["a nested path", `/quiz-assets/${QUIZ_ID}/sub/dir/undo-stack.svg`],
    ["a missing filename segment", `/quiz-assets/${QUIZ_ID}/`],
    ["a bare route", "/quiz-assets/"],
    ["a non-kebab quiz id", "/quiz-assets/Undo_Redo/undo-stack.svg"],
    ["a disallowed extension", `/quiz-assets/${QUIZ_ID}/undo-stack.bmp`],
    ["a non-kebab filename", `/quiz-assets/${QUIZ_ID}/Undo_Stack.svg`],
    ["a malformed escape", `/quiz-assets/${QUIZ_ID}/%E0%A4%A.svg`],
  ])("rejects %s as unservable", (_label, requestUrl) => {
    expect(parseAssetRequest(requestUrl, "/")).toBeNull();
  });
});
