import { readFile } from "node:fs/promises";
import { describe, expect, test } from "vitest";

describe("shared style layer order", () => {
  test("keeps utility classes above shared layout and typography", async () => {
    const stylesheet = await readFile(new URL("./index.css", import.meta.url), "utf8");

    expect(stylesheet).toMatch(/^@layer reset, base, layout, typography, utils, ui;$/m);
  });
});
