import { afterEach, describe, expect, test, vi } from "vitest";

import { quizAssetUrl, resolveImageSrc } from "./quiz-asset-url";

afterEach(() => {
  vi.unstubAllEnvs();
});

describe("quizAssetUrl", () => {
  test("builds a base-aware URL for a vendored Quiz Image", () => {
    expect(quizAssetUrl("cache-hierarchy", "cache-tiers.svg")).toBe(
      "/quiz-assets/cache-hierarchy/cache-tiers.svg",
    );
  });

  test("keeps the GitHub Pages base in the asset URL", () => {
    vi.stubEnv("BASE_URL", "/quizbun/");

    expect(quizAssetUrl("cache-hierarchy", "cache-tiers.svg")).toBe(
      "/quizbun/quiz-assets/cache-hierarchy/cache-tiers.svg",
    );
  });
});

describe("resolveImageSrc", () => {
  test("keeps an https URL unchanged", () => {
    const src = "https://example.com/cache-tiers.svg";

    expect(resolveImageSrc("cache-hierarchy", src)).toBe(src);
  });

  test("resolves a bare filename through the Quiz asset route", () => {
    expect(resolveImageSrc("cache-hierarchy", "cache-tiers.svg")).toBe(
      "/quiz-assets/cache-hierarchy/cache-tiers.svg",
    );
  });
});
