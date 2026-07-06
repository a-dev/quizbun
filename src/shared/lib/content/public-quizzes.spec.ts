import { describe, expect, test } from "vitest";

import {
  loadFeaturedQuizIds,
  loadPublicQuizzes,
  parseFeaturedQuizIds,
  parsePublicQuizAddedDates,
  selectFeaturedQuizzes,
  selectRecentQuizzes,
  type PublicQuizSummary,
} from "./public-quizzes";

const fixtureDir = (name: string) => `src/shared/lib/content/fixtures/${name}`;
const fixedNow = new Date("2026-06-12T12:00:00.000Z");

describe("loadPublicQuizzes", () => {
  test("loads a valid content directory with summaries and tag counts", () => {
    const catalog = loadPublicQuizzes(fixtureDir("valid"), {
      addedAtByFileName: new Map([
        ["css-layout.json", "2026-01-01T00:00:00.000Z"],
        ["typescript-basics.json", "2026-01-02T00:00:00.000Z"],
      ]),
      warnOnDateFallback: false,
    });

    expect(catalog.quizzes.map((quiz) => quiz.id)).toEqual(["css-layout", "typescript-basics"]);

    expect(catalog.summaries).toEqual([
      {
        id: "css-layout",
        title: "CSS layout fundamentals",
        description: "Flexbox and grid basics.",
        tags: ["css", "web"],
        questionCount: 1,
        addedAt: "2026-01-01T00:00:00.000Z",
      },
      {
        id: "typescript-basics",
        title: "TypeScript basics",
        tags: ["typescript", "web"],
        questionCount: 2,
        addedAt: "2026-01-02T00:00:00.000Z",
      },
    ]);

    expect(catalog.tags).toEqual([
      { tag: "css", count: 1 },
      { tag: "typescript", count: 1 },
      { tag: "web", count: 2 },
    ]);
  });

  test("returns an empty catalog for a directory without quiz files", () => {
    const catalog = loadPublicQuizzes(fixtureDir("empty"), { warnOnDateFallback: false });

    expect(catalog.quizzes).toEqual([]);
    expect(catalog.summaries).toEqual([]);
    expect(catalog.tags).toEqual([]);
  });

  test("falls back to the current build time when a git date is missing", () => {
    const catalog = loadPublicQuizzes(fixtureDir("valid"), {
      addedAtByFileName: new Map([["css-layout.json", "2026-01-01T00:00:00.000Z"]]),
      now: fixedNow,
      warnOnDateFallback: false,
    });

    expect(catalog.summaries.map((summary) => [summary.id, summary.addedAt])).toEqual([
      ["css-layout", "2026-01-01T00:00:00.000Z"],
      ["typescript-basics", "2026-06-12T12:00:00.000Z"],
    ]);
  });

  test("fails on an invalid quiz with a path-precise message", () => {
    expect(() =>
      loadPublicQuizzes(fixtureDir("invalid-quiz"), { warnOnDateFallback: false }),
    ).toThrow(/bad-quiz\.json[\s\S]*questions\[0\]\.explanation[\s\S]*Required field is missing/);
  });

  test("fails on a duplicate quiz id across files", () => {
    expect(() =>
      loadPublicQuizzes(fixtureDir("duplicate-id"), { warnOnDateFallback: false }),
    ).toThrow(/quiz-b\.json[\s\S]*"quiz-a" is already used by quiz-a\.json/);
  });

  test("fails when the filename does not match the quiz id", () => {
    expect(() =>
      loadPublicQuizzes(fixtureDir("filename-mismatch"), { warnOnDateFallback: false }),
    ).toThrow(/quiz-c\.json[\s\S]*id is "actual-id"[\s\S]*Rename the file to `actual-id\.json`/);
  });

  test("fails with a clear message when the content directory is missing", () => {
    expect(() => loadPublicQuizzes(fixtureDir("does-not-exist"))).toThrow(
      /Public quizzes directory not found/,
    );
  });
});

describe("parsePublicQuizAddedDates", () => {
  test("parses one git log pass into file-name dates", () => {
    const addedAtByFileName = parsePublicQuizAddedDates(
      [
        "2026-06-12T20:40:38+04:00",
        "",
        "A\tcontent/quizzes/javascript-promises-basics.json",
        "A\tcontent/quizzes/README.md",
        "2026-06-12T07:36:59+04:00",
        "",
        "A\tcontent/quizzes/css-box-model.json",
        "M\tcontent/quizzes/ignored-existing-file.json",
        "A\tdocs/examples/ignored-example.json",
      ].join("\n"),
    );

    expect(addedAtByFileName).toEqual(
      new Map([
        ["javascript-promises-basics.json", "2026-06-12T20:40:38+04:00"],
        ["css-box-model.json", "2026-06-12T07:36:59+04:00"],
      ]),
    );
  });

  test("keeps the earliest add date if git output contains duplicate additions", () => {
    const addedAtByFileName = parsePublicQuizAddedDates(
      [
        "2026-06-12T20:40:38+04:00",
        "A\tcontent/quizzes/readded.json",
        "2026-06-10T20:40:38+04:00",
        "A\tcontent/quizzes/readded.json",
      ].join("\n"),
    );

    expect(addedAtByFileName.get("readded.json")).toBe("2026-06-10T20:40:38+04:00");
  });
});

describe("selectRecentQuizzes", () => {
  test("selects newest summaries with filename-stable tie breaking", () => {
    const summaries = [
      makeSummary("beta", "2026-06-11T00:00:00.000Z"),
      makeSummary("alpha", "2026-06-12T00:00:00.000Z"),
      makeSummary("gamma", "2026-06-12T00:00:00.000Z"),
    ];

    expect(selectRecentQuizzes(summaries, 2).map((summary) => summary.id)).toEqual([
      "alpha",
      "gamma",
    ]);
  });
});

describe("loadFeaturedQuizIds", () => {
  test("loads one featured Quiz id per line", () => {
    expect(loadFeaturedQuizIds("src/shared/lib/content/fixtures/featured-quizzes.txt")).toEqual([
      "typescript-basics",
      "css-layout",
    ]);
  });
});

describe("parseFeaturedQuizIds", () => {
  test("ignores blank lines and comments", () => {
    expect(
      parseFeaturedQuizIds(
        ["", "# featured", "typescript-basics", "  css-layout  "].join("\n"),
        "fixture",
      ),
    ).toEqual(["typescript-basics", "css-layout"]);
  });

  test("fails when a featured Quiz id is not kebab-case", () => {
    expect(() => parseFeaturedQuizIds("TypeScript Basics", "fixture")).toThrow(
      /line 1[\s\S]*not a valid Quiz id/,
    );
  });

  test("fails when a featured Quiz id is duplicated", () => {
    expect(() =>
      parseFeaturedQuizIds(
        ["typescript-basics", "css-layout", "typescript-basics"].join("\n"),
        "fixture",
      ),
    ).toThrow(/line 3[\s\S]*already listed on line 1/);
  });
});

describe("selectFeaturedQuizzes", () => {
  test("selects summaries in featured file order", () => {
    const summaries = [
      makeSummary("css-layout", "2026-06-12T00:00:00.000Z"),
      makeSummary("typescript-basics", "2026-06-11T00:00:00.000Z"),
    ];

    expect(
      selectFeaturedQuizzes(summaries, ["typescript-basics", "css-layout"]).map(
        (summary) => summary.id,
      ),
    ).toEqual(["typescript-basics", "css-layout"]);
  });

  test("fails when a featured Quiz id is not in the public Catalog", () => {
    expect(() => selectFeaturedQuizzes([], ["missing-quiz"], "fixture")).toThrow(
      /missing-quiz[\s\S]*does not match any public Quiz id/,
    );
  });
});

function makeSummary(id: string, addedAt: string): PublicQuizSummary {
  return {
    id,
    title: id,
    tags: [],
    questionCount: 1,
    addedAt,
  };
}
