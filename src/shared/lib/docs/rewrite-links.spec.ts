import { describe, expect, it } from "vitest";

import { type DocLinkContext, GITHUB_REPO_URL, resolveDocLink } from "./rewrite-links";

const context = (overrides: Partial<DocLinkContext> = {}): DocLinkContext => ({
  base: "/quizbun/",
  fileExists: () => true,
  sourceRepoPath: "docs/standard.md",
  ...overrides,
});

describe("resolveDocLink", () => {
  it("rewrites links between published docs to site routes", () => {
    expect(resolveDocLink("./quiz-generation-prompt.md", context())).toBe("/quizbun/docs/prompt/");
    expect(
      resolveDocLink("../standard.md", context({ sourceRepoPath: "docs/examples/README.md" })),
    ).toBe("/quizbun/docs/standard/");
  });

  it("preserves fragments on rewritten site links", () => {
    expect(
      resolveDocLink("./standard.md#markdown", context({ sourceRepoPath: "docs/contributing.md" })),
    ).toBe("/quizbun/docs/standard/#markdown");
  });

  it("works without a base path prefix", () => {
    expect(resolveDocLink("./examples/README.md", context({ base: "/" }))).toBe("/docs/examples/");
  });

  it("rewrites the committed schema artifact to the published route", () => {
    expect(
      resolveDocLink(
        "../../public/schema/quiz.v1.json",
        context({ sourceRepoPath: "docs/examples/README.md" }),
      ),
    ).toBe("/quizbun/schema/quiz.v1.json");
  });

  it("rewrites canonical example JSON files to their download routes", () => {
    expect(
      resolveDocLink(
        "./public-quiz-single-choice.json",
        context({ sourceRepoPath: "docs/examples/README.md" }),
      ),
    ).toBe("/quizbun/docs/examples/public-quiz-single-choice.json");
  });

  it("points repo-only files at GitHub", () => {
    expect(resolveDocLink("../CONTEXT.md", context())).toBe(
      `${GITHUB_REPO_URL}/blob/main/CONTEXT.md`,
    );
  });

  it("rewrites absolute live-site links to base-relative ones", () => {
    expect(resolveDocLink("https://a-dev.github.io/quizbun/import/", context())).toBe(
      "/quizbun/import/",
    );
  });

  it("passes through external, mailto, and fragment-only links", () => {
    expect(resolveDocLink("https://example.com/page", context())).toBe("https://example.com/page");
    expect(resolveDocLink("mailto:hi@example.com", context())).toBe("mailto:hi@example.com");
    expect(resolveDocLink("#versioning-and-strictness", context())).toBe(
      "#versioning-and-strictness",
    );
  });

  it("throws on links that resolve to neither a site page nor a repo file", () => {
    expect(() => resolveDocLink("./missing.md", context({ fileExists: () => false }))).toThrow(
      /neither a site page nor a repo file/,
    );
  });

  it("throws on links that escape the repository root", () => {
    expect(() => resolveDocLink("../../outside.md", context())).toThrow(
      /escapes the repository root/,
    );
  });

  it("resolves real repo links in the committed docs without a stub", () => {
    expect(resolveDocLink("../CONTEXT.md", { base: "/", sourceRepoPath: "docs/standard.md" })).toBe(
      `${GITHUB_REPO_URL}/blob/main/CONTEXT.md`,
    );
  });
});
