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
      'See [the prompt](./quiz-generation-prompt.md). <script>alert("x")</script>',
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
