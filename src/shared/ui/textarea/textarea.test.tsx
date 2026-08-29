import { describe, expect, it, vi } from "vitest";
import { page, userEvent } from "vitest/browser";

import { CodeTextarea, Textarea } from "./index";

const sizesToContentNatively = CSS.supports("field-sizing", "content");

describe("Textarea", () => {
  it("forwards typed input and updates its content height", async () => {
    const onChange = vi.fn();
    const screen = await page.render(<Textarea aria-label="Quiz notes" onChange={onChange} />);
    const textarea = screen.getByRole("textbox", { name: "Quiz notes" });
    const initialHeight = getAutoHeight(textarea);

    await userEvent.fill(textarea, "First line\nSecond line\nThird line");

    await expect.element(textarea).toHaveValue("First line\nSecond line\nThird line");
    await expect(onChange).toHaveBeenCalled();
    expect(getAutoHeight(textarea)).toBeGreaterThan(initialHeight);
  });

  it("honors the rows prop as its minimum height", async () => {
    const screen = await page.render(<Textarea aria-label="Quiz notes" rows={6} />);
    const textarea = screen.getByRole("textbox", { name: "Quiz notes" });

    expect(getAutoHeight(textarea)).toBeGreaterThan(100);
  });

  it("does not allow manual resizing", async () => {
    const screen = await page.render(<Textarea aria-label="Quiz notes" />);
    const textarea = screen.getByRole("textbox", { name: "Quiz notes" });

    expect(getComputedStyle(textarea.element()).resize).toBe("none");
  });

  it.skipIf(!sizesToContentNatively)("sizes itself to its content in CSS", async () => {
    const screen = await page.render(<Textarea aria-label="Quiz notes" />);
    const textarea = screen.getByRole("textbox", { name: "Quiz notes" }).element();

    expect(getComputedStyle(textarea).getPropertyValue("field-sizing")).toBe("content");
    // The measuring fallback must stay out of the way: an explicit height would
    // override the native sizing it is meant to replace.
    expect((textarea as HTMLTextAreaElement).style.getPropertyValue("--_height")).toBe("");
  });

  it("keeps growing to fit long content", async () => {
    const screen = await page.render(<Textarea aria-label="Quiz notes" />);
    const textarea = screen.getByRole("textbox", { name: "Quiz notes" });

    await userEvent.fill(textarea, Array.from({ length: 60 }, (_, i) => `line ${i}`).join("\n"));

    const element = textarea.element() as HTMLTextAreaElement;

    expect(getComputedStyle(element).maxBlockSize).toBe("none");
    expect(element.clientHeight).toBeGreaterThanOrEqual(element.scrollHeight);
  });

  // Only the JS fallback can move the page: it writes an explicit height, and
  // restores the scroll position that height change disturbed. Under
  // `field-sizing` the growth happens in layout and never scrolls the document.
  it.skipIf(sizesToContentNatively)("preserves document scroll while editing", async () => {
    const scrollTo = vi.spyOn(window, "scrollTo").mockImplementation(() => undefined);
    const screen = await page.render(<Textarea aria-label="Quiz notes" />);
    const textarea = screen.getByRole("textbox", { name: "Quiz notes" });

    await userEvent.fill(textarea, "Updated notes");

    expect(scrollTo).toHaveBeenLastCalledWith(window.scrollX, window.scrollY);

    scrollTo.mockRestore();
  });
});

/**
 * The rendered height, whichever path produced it: `field-sizing: content` in
 * CSS, or the measured `--_height` fallback. Asserting on the rendered box
 * rather than the private custom property keeps these tests true of both.
 */
function getAutoHeight(textarea: ReturnType<typeof page.getByRole>): number {
  return (textarea.element() as HTMLTextAreaElement).offsetHeight;
}

describe("CodeTextarea", () => {
  it("renders JSON syntax tokens behind an editable textarea", async () => {
    const screen = await page.render(
      <CodeTextarea
        aria-label="Quiz JSON"
        defaultValue={'{ "title": "JavaScript", "draft": true }'}
      />,
    );

    const textarea = screen.getByRole("textbox", { name: "Quiz JSON" });
    const property = screen.container.querySelector<HTMLSpanElement>(".token.property");
    const boolean = screen.container.querySelector<HTMLSpanElement>(".token.boolean");

    await expect.element(textarea).toHaveValue('{ "title": "JavaScript", "draft": true }');
    await expect.element(property!).toHaveTextContent('"title"');
    await expect.element(boolean!).toHaveTextContent("true");
    await expect
      .element(screen.container.querySelector<HTMLPreElement>("pre")!)
      .toHaveAttribute("aria-hidden", "true");
  });

  it("updates the highlighted JSON while editing an uncontrolled value", async () => {
    const screen = await page.render(<CodeTextarea aria-label="Quiz JSON" defaultValue="{}" />);
    const textarea = screen.getByRole("textbox", { name: "Quiz JSON" });

    await userEvent.fill(textarea, '{ "count": 1 }');

    await expect.element(textarea).toHaveValue('{ "count": 1 }');
    // Highlighting uses a deferred value, so keep this locator live while React catches up.
    await expect.element(screen.getByText("1", { exact: true })).toHaveClass("token", "number");
  });

  it("keeps the native selection glyphs transparent", async () => {
    const screen = await page.render(
      <CodeTextarea aria-label="Quiz JSON" defaultValue='{ "title": "JavaScript" }' />,
    );
    const textarea = screen
      .getByRole("textbox", { name: "Quiz JSON" })
      .element() as HTMLTextAreaElement;

    textarea.setSelectionRange(0, 8);

    expect(getComputedStyle(textarea, "::selection").color).toBe("rgba(0, 0, 0, 0)");
  });

  it("uses matching soft-wrap rules for the input and its syntax layer", async () => {
    const screen = await page.render(
      <CodeTextarea
        aria-label="Quiz JSON"
        defaultValue='{ "url": "https://example.com/a-very-long-unbroken-json-value" }'
      />,
    );
    const textarea = screen
      .getByRole("textbox", { name: "Quiz JSON" })
      .element() as HTMLTextAreaElement;
    const code = screen.container.querySelector<HTMLPreElement>("pre")!;

    expect(textarea.wrap).toBe("soft");
    expect(getComputedStyle(textarea).whiteSpace).toBe("pre-wrap");
    expect(getComputedStyle(textarea).overflowWrap).toBe("anywhere");
    expect(getComputedStyle(code).whiteSpace).toBe("pre-wrap");
    expect(getComputedStyle(code).overflowWrap).toBe("anywhere");
  });

  // The highlighted <pre> is inset over the textarea, so the two glyph layers
  // only stay aligned while the wrapper tracks the field's height. Growth is
  // the case that breaks it, whichever path drives the growth.
  it("keeps the syntax layer the same height as the field while it grows", async () => {
    const screen = await page.render(<CodeTextarea aria-label="Quiz JSON" defaultValue="{}" />);
    const textarea = screen.getByRole("textbox", { name: "Quiz JSON" });
    const code = screen.container.querySelector<HTMLPreElement>("pre")!;
    const element = textarea.element() as HTMLTextAreaElement;
    const initialHeight = element.offsetHeight;

    await userEvent.fill(
      textarea,
      `{\n${Array.from({ length: 12 }, (_, i) => `  "key${i}": ${i}`).join(",\n")}\n}`,
    );

    expect(element.offsetHeight).toBeGreaterThan(initialHeight);
    // `inset: 1px` on the wrapper, so the layer is the field less its borders.
    expect(Math.abs(code.offsetHeight - (element.offsetHeight - 2))).toBeLessThanOrEqual(1);
  });

  it("uses identical text metrics for editing and highlighting", async () => {
    const screen = await page.render(
      <CodeTextarea aria-label="Quiz JSON" defaultValue='{ "id": "javascript-basics" }' />,
    );
    const textarea = screen.getByRole("textbox", { name: "Quiz JSON" }).element();
    const code = screen.container.querySelector<HTMLElement>("pre code")!;
    const textareaStyle = getComputedStyle(textarea);
    const codeStyle = getComputedStyle(code);

    expect(textareaStyle.fontFamily).toBe(codeStyle.fontFamily);
    expect(textareaStyle.fontSize).toBe(codeStyle.fontSize);
    expect(textareaStyle.lineHeight).toBe(codeStyle.lineHeight);
  });
});
