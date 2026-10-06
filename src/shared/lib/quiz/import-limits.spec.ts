import { describe, expect, test, vi } from "vitest";

import {
  checkImportQuestionCount,
  checkImportSize,
  MAX_IMPORT_BYTES,
  MAX_IMPORT_QUESTIONS,
} from "./import-limits";

describe("checkImportQuestionCount", () => {
  test("accepts exactly the maximum number of Questions", () => {
    expect(
      checkImportQuestionCount({
        questions: Array.from({ length: MAX_IMPORT_QUESTIONS }, () => ({})),
      }),
    ).toBeUndefined();
  });

  test("rejects one Question over the maximum with a Quizbun-limit report", () => {
    const report = checkImportQuestionCount({ questions: Array.from({ length: 201 }, () => ({})) });

    expect(report).toContain("This is a Quizbun limit, not a Standard error.");
    expect(report).toContain("Path: `questions`");
    expect(report).toContain("201 Questions; Quizbun imports up to 200");
    expect(report).toContain("Fix: split the Quiz");
  });

  test.each([undefined, null, "text", {}, { questions: "many" }])(
    "leaves non-array input %j to the schema",
    (input) => {
      expect(checkImportQuestionCount(input)).toBeUndefined();
    },
  );
});

describe("checkImportSize", () => {
  test("accepts exactly the maximum number of bytes", () => {
    expect(checkImportSize("a".repeat(MAX_IMPORT_BYTES))).toBeUndefined();
  });

  test("rejects one byte over the maximum", () => {
    const report = checkImportSize("a".repeat(MAX_IMPORT_BYTES + 1));

    expect(report).toContain("This is a Quizbun limit, not a Standard error.");
    expect(report).toContain("Path: `root`");
    expect(report).toContain("Quizbun imports up to 1 MB");
  });

  test("counts bytes, not string length, for multi-byte characters", () => {
    // 2 bytes per character: half the characters already fill the limit.
    const fits = "é".repeat(MAX_IMPORT_BYTES / 2);

    expect(fits.length).toBeLessThan(MAX_IMPORT_BYTES);
    expect(checkImportSize(fits)).toBeUndefined();
    expect(checkImportSize(`${fits}a`)).toBeDefined();
  });

  test("reports the actual size in megabytes", () => {
    expect(checkImportSize("a".repeat(1_468_006))).toContain("the Quiz JSON is 1.4 MB");
  });

  test("never calls JSON.parse itself", () => {
    const parse = vi.spyOn(JSON, "parse");

    checkImportSize("a".repeat(MAX_IMPORT_BYTES + 1));

    expect(parse).not.toHaveBeenCalled();
    parse.mockRestore();
  });
});
