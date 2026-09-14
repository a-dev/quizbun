import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

import { renderDocMarkdown } from "./render-doc";

describe("renderDocMarkdown", () => {
  it("renders the committed standard document with heading ids and a readable status banner", () => {
    const source = readFileSync(resolve(process.cwd(), "docs/standard.md"), "utf8");
    const html = renderDocMarkdown(source, {
      base: "/quizbun/",
      sourceRepoPath: "docs/standard.md",
    });

    expect(html).toContain('<h1 id="quiz-object-standard">');
    expect(html).toContain("<strong>Important:</strong>");
    expect(html).not.toContain("[!IMPORTANT]");
  });

  it("rewrites relative doc links and strips raw HTML", () => {
    const html = renderDocMarkdown(
      'See [the prompt](./quiz-generation-page.md). <script>alert("x")</script>',
      { base: "/quizbun/", fileExists: () => true, sourceRepoPath: "docs/standard.md" },
    );

    expect(html).toContain('href="/quizbun/docs/prompt/"');
    expect(html).not.toContain("<script>");
  });

  it("marks external links with rel=noreferrer", () => {
    const html = renderDocMarkdown("[external](https://example.com/page)", {
      base: "/",
      fileExists: () => true,
      sourceRepoPath: "docs/standard.md",
    });

    expect(html).toContain('rel="noreferrer"');
  });

  it("leaves internal links without a rel, and marks plain http as external", () => {
    const context = { base: "/", fileExists: () => true, sourceRepoPath: "docs/standard.md" };

    expect(renderDocMarkdown("[internal](./quiz-generation-page.md)", context)).not.toContain(
      "rel=",
    );
    expect(renderDocMarkdown("[plain](http://example.com/x)", context)).toContain(
      'rel="noreferrer"',
    );
  });

  it("keeps GFM on and soft line breaks off", () => {
    const context = { base: "/", fileExists: () => true, sourceRepoPath: "docs/standard.md" };

    expect(renderDocMarkdown("| a | b |\n| --- | --- |\n| 1 | 2 |", context)).toContain("<table>");
    expect(renderDocMarkdown("line one\nline two", context)).not.toContain("<br");
  });

  it("replaces an alert marker only when it is the whole line", () => {
    const context = { base: "/", fileExists: () => true, sourceRepoPath: "docs/standard.md" };

    // Trailing whitespace is still just a marker line.
    expect(renderDocMarkdown("> [!NOTE]   \n> body", context)).toContain("<strong>Note:</strong>");
    // Anything else on the line, or a marker mid-sentence, is literal text.
    expect(renderDocMarkdown("> [!NOTE] extra\n> body", context)).toContain("[!NOTE] extra");
    expect(renderDocMarkdown("text > [!NOTE] inline", context)).toContain("[!NOTE] inline");
  });

  it("resolves image sources too, so a broken one fails the build", () => {
    expect(() =>
      renderDocMarkdown("![alt](./does-not-exist.md)", {
        base: "/",
        fileExists: () => false,
        sourceRepoPath: "docs/standard.md",
      }),
    ).toThrow(/neither a site page nor a repo file/);
  });

  it("fails the build on an unresolvable docs link", () => {
    expect(() =>
      renderDocMarkdown("[broken](./does-not-exist.md)", {
        base: "/",
        fileExists: () => false,
        sourceRepoPath: "docs/standard.md",
      }),
    ).toThrow(/neither a site page nor a repo file/);
  });
});
