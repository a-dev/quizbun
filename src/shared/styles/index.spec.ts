import { readFile } from "node:fs/promises";
import { describe, expect, test } from "vitest";

const LAYER_ORDER = "@layer reset, base, layout, typography, utils, ui;";

const read = (path: string) => readFile(new URL(path, import.meta.url), "utf8");

describe("shared style layer order", () => {
  test("keeps utility classes above shared layout and typography", async () => {
    expect(await read("./index.css")).toContain(LAYER_ORDER);
  });

  // index.css alone cannot pin the order: Astro inlines some component styles
  // above the `<link>` to the bundle, and Lightning CSS strips the statement
  // from the chunk while minifying. The app shell has to state it inline,
  // before anything else in `<head>`.
  test("the app shell inlines the same order ahead of every other style", async () => {
    const head = (await read("../../app/layout.astro")).split("<head>")[1] ?? "";

    expect(head).toContain(`<style is:inline>${LAYER_ORDER}</style>`);
    expect(head.indexOf(LAYER_ORDER)).toBeLessThan(head.indexOf("<meta"));
  });
});
