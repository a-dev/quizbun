import { describe, expect, test } from "vitest";

import {
  addHeadingIds,
  renderInlineMarkdown,
  renderInlineMarkdownExcerpt,
  renderInlineMarkdownPlainText,
  renderMarkdown,
  renderMarkdownPlainText,
} from "./markdown";
import { MARKDOWN_FIELD_TIERS, renderMarkdownField, renderMarkdownFieldText } from "./tiers";

describe("renderMarkdown", () => {
  test("highlights JavaScript fenced code blocks with Prism tokens", () => {
    const html = renderMarkdown("```js\nconst value = Promise.resolve(1);\n```");

    expect(html).toContain('<pre class="language-js"><code class="language-js">');
    expect(html).toContain('<span class="token keyword">const</span>');
    expect(html).toContain('<span class="token function">resolve</span>');
  });

  test("highlights Python fenced code blocks with Prism tokens", () => {
    const html = renderMarkdown("```python\ndef add(a, b):\n    return a + b\n```");

    expect(html).toContain('<pre class="language-python"><code class="language-python">');
    expect(html).toContain('<span class="token keyword">def</span>');
  });

  test("highlights HTML and CSS via Prism core grammars", () => {
    const htmlBlock = renderMarkdown('```html\n<a href="#">x</a>\n```');
    expect(htmlBlock).toContain('<pre class="language-html">');
    expect(htmlBlock).toContain('class="token');

    const cssBlock = renderMarkdown("```css\na { color: red; }\n```");
    expect(cssBlock).toContain('<pre class="language-css">');
    expect(cssBlock).toContain('class="token');
  });

  test("leaves unsupported fenced code blocks escaped and unhighlighted", () => {
    const html = renderMarkdown("```mermaid\ngraph TD\n```");

    expect(html).toContain('<code class="language-mermaid">graph TD\n</code>');
    expect(html).not.toContain('class="token');
  });

  test("does not allow user-authored token spans through the sanitizer", () => {
    const html = renderMarkdown('<span class="token keyword">const</span>');

    expect(html).toBe("<p>const</p>\n");
  });

  test("highlights a fenced block nested inside another block", () => {
    const html = renderMarkdown("> quoted\n>\n> ```js\n> const value = 1;\n> ```");

    expect(html).toContain('<pre class="language-js">');
    expect(html).toContain('<span class="token keyword">const</span>');
  });

  test("leaves a fence with no language escaped and unhighlighted", () => {
    const html = renderMarkdown("```\nconst value = 1;\n```");

    expect(html).toContain("<pre><code>const value = 1;\n</code></pre>");
    expect(html).not.toContain('class="token');
  });

  test("keeps a relative link free of rel, and marks an external one", () => {
    expect(renderMarkdown("[docs](/quizbun/docs/)")).not.toContain("rel=");
    expect(renderMarkdown("[docs](http://example.com/)")).toContain('rel="noreferrer"');
  });

  test("returns empty string for blank input", () => {
    expect(renderMarkdown("   \n  ")).toBe("");
  });
});

describe("addHeadingIds", () => {
  test("slugs the visible text, dropping tags and entities", () => {
    // Tags and entities become separators, not nothing: `Set<em>up</em>` is two
    // words on screen, so its slug has to be too.
    expect(addHeadingIds("<h2>Set<em>up</em>the CLI</h2>")).toBe(
      '<h2 id="set-up-the-cli">Set<em>up</em>the CLI</h2>',
    );
    expect(addHeadingIds("<h3>Tags&amp;topics</h3>")).toBe(
      '<h3 id="tags-topics">Tags&amp;topics</h3>',
    );
  });

  test("trims the hyphens punctuation leaves at either end", () => {
    expect(addHeadingIds("<h2>!Ready?</h2>")).toBe('<h2 id="ready">!Ready?</h2>');
  });

  test("falls back to `section` when nothing sluggable is left", () => {
    expect(addHeadingIds("<h2>!!!</h2>")).toBe('<h2 id="section">!!!</h2>');
  });

  test("disambiguates repeated headings by a running count", () => {
    expect(addHeadingIds("<h2>Intro</h2><h2>Intro</h2><h2>Intro</h2>")).toBe(
      '<h2 id="intro">Intro</h2><h2 id="intro-2">Intro</h2><h2 id="intro-3">Intro</h2>',
    );
  });

  test("leaves headings that already carry attributes alone", () => {
    expect(addHeadingIds('<h2 id="kept">Intro</h2>')).toBe('<h2 id="kept">Intro</h2>');
  });
});

describe("renderInlineMarkdown", () => {
  test("renders inline tokens", () => {
    expect(renderInlineMarkdown("**bold** and `code` and *em*")).toBe(
      "<strong>bold</strong> and <code>code</code> and <em>em</em>",
    );
  });

  test("renders links with noreferrer on external hrefs", () => {
    expect(renderInlineMarkdown("[site](https://example.com)")).toBe(
      '<a href="https://example.com" rel="noreferrer">site</a>',
    );
  });

  test("does not wrap output in a paragraph", () => {
    expect(renderInlineMarkdown("plain text")).toBe("plain text");
  });

  test("block Markdown degrades to inline instead of rendering blocks", () => {
    const heading = renderInlineMarkdown("## Not a heading");
    expect(heading).not.toContain("<h2");
    expect(heading).toContain("Not a heading");

    const list = renderInlineMarkdown("- item one\n- item two");
    expect(list).not.toContain("<li");
    expect(list).not.toContain("<ul");
  });

  test("returns empty string for blank input", () => {
    expect(renderInlineMarkdown("   ")).toBe("");
  });
});

describe("renderInlineMarkdownExcerpt", () => {
  test("returns rendered inline Markdown unchanged when it fits", () => {
    expect(
      renderInlineMarkdownExcerpt("A **short** description.", {
        maxLength: 80,
      }),
    ).toBe("A <strong>short</strong> description.");
  });

  test("truncates at a word boundary and appends an ellipsis", () => {
    expect(
      renderInlineMarkdownExcerpt("This description should stop before a half word.", {
        maxLength: 29,
      }),
    ).toBe("This description should...");
  });

  test("omits a normal word instead of cutting it", () => {
    expect(
      renderInlineMarkdownExcerpt("Alpha bravo charlie", {
        maxLength: 17,
      }),
    ).toBe("Alpha bravo...");
  });

  test("cuts an unreasonable word at a grapheme boundary", () => {
    expect(
      renderInlineMarkdownExcerpt("supercalifragilisticexpialidocious", {
        maxLength: 16,
        maxWordLength: 8,
      }),
    ).toBe("supercal...");
  });

  test("preserves and closes nested inline tags", () => {
    expect(
      renderInlineMarkdownExcerpt("This is **very _important_ text** for learners.", {
        maxLength: 28,
      }),
    ).toBe("This is <strong>very <em>important</em></strong>...");
  });

  test("preserves links when truncating inside linked text", () => {
    expect(
      renderInlineMarkdownExcerpt(
        "Read [the detailed guide for contributors](https://example.com).",
        {
          maxLength: 23,
        },
      ),
    ).toBe('Read <a href="https://example.com" rel="noreferrer">the detailed</a>...');
  });

  test("counts entities as visible characters", () => {
    expect(
      renderInlineMarkdownExcerpt("Use A & B with C and D.", {
        maxLength: 16,
      }),
    ).toBe("Use A &amp; B...");
  });

  test("strips hostile input before truncation", () => {
    const html = renderInlineMarkdownExcerpt('Safe <script>alert("x")</script> words continue', {
      maxLength: 18,
    });

    expect(html).toBe("Safe  words...");
    expect(html).not.toContain("<script");
    expect(html).not.toContain("alert");
  });
});

describe("plain-text Markdown rendering", () => {
  test("strips inline formatting and keeps visible text", () => {
    expect(renderInlineMarkdownPlainText("Use **React** `state`")).toBe("Use React state");
    expect(renderInlineMarkdownPlainText("[docs](https://example.com)")).toBe("docs");
  });

  test("strips hostile raw HTML after Markdown sanitization", () => {
    expect(renderInlineMarkdownPlainText('Safe <script>alert("x")</script> text')).toBe(
      "Safe text",
    );
  });

  test("normalizes block Markdown spacing", () => {
    expect(renderMarkdownPlainText("## Why\n\nBecause **it works**.")).toBe(
      "Why Because it works.",
    );
  });
});

describe("hostile input is stripped in both tiers", () => {
  const renderers = {
    full: renderMarkdown,
    inline: renderInlineMarkdown,
  } as const;

  for (const [tier, render] of Object.entries(renderers)) {
    test(`${tier}: script tags are removed`, () => {
      const html = render('hello <script>alert("x")</script> world');
      expect(html).not.toContain("<script");
      expect(html).not.toContain("alert");
    });

    test(`${tier}: event handlers are removed`, () => {
      const html = render('<img src="x" onerror="alert(1)"> and <em onclick="x()">em</em>');
      expect(html).not.toContain("onerror");
      expect(html).not.toContain("onclick");
      expect(html).not.toContain("<img");
    });

    // D13: the structured `images` field is the only image channel, so the
    // sanitizer must close the Markdown one too. docs/standard.md states this
    // normatively, and the validator is pure Zod over JSON — it cannot police
    // prose, so the guarantee lives here or nowhere.
    test(`${tier}: Markdown image syntax is inert`, () => {
      const html = render("![a diagram](cache-tiers.svg)");
      expect(html).not.toContain("<img");
      expect(html).not.toContain("cache-tiers.svg");
    });

    test(`${tier}: an image wrapped in a link leaves the link empty`, () => {
      const html = render("[![a diagram](cache-tiers.svg)](https://example.com)");
      expect(html).not.toContain("<img");
      expect(html).not.toContain("cache-tiers.svg");
    });

    test(`${tier}: javascript: links are removed`, () => {
      const html = render("[click](javascript:alert(1))");
      expect(html).not.toContain("javascript:");
    });
  }
});

describe("renderMarkdownField", () => {
  test("long fields render blocks", () => {
    expect(renderMarkdownField("explanation", "## Why")).toContain("<h2");
    expect(renderMarkdownField("questionReferences", "## Further reading")).toContain("<h2");
  });

  test("short fields stay inline", () => {
    expect(renderMarkdownField("optionText", "## Why")).not.toContain("<h2");
  });

  test("tags are never rendered as Markdown and are HTML-escaped", () => {
    expect(renderMarkdownField("tag", "**not bold**")).toBe("**not bold**");
    expect(renderMarkdownField("tag", "<b>x</b>")).toBe("&lt;b&gt;x&lt;/b&gt;");
  });

  test("field text strips formatting according to field tier", () => {
    expect(renderMarkdownFieldText("quizTitle", "**Title**")).toBe("Title");
    expect(renderMarkdownFieldText("quizDescription", "## About\n\n**Text**")).toBe("About Text");
    expect(renderMarkdownFieldText("tag", "**tag**")).toBe("**tag**");
  });

  test("every field has a tier assigned", () => {
    expect(Object.values(MARKDOWN_FIELD_TIERS)).not.toContain(undefined);
  });
});
