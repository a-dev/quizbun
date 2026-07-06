import { describe, expect, it, vi } from "vitest";
import { page, userEvent } from "vitest/browser";

import { CodeTextarea, Textarea } from "./index";

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

  it("preserves document scroll while editing", async () => {
    const scrollTo = vi.spyOn(window, "scrollTo").mockImplementation(() => undefined);
    const screen = await page.render(<Textarea aria-label="Quiz notes" />);
    const textarea = screen.getByRole("textbox", { name: "Quiz notes" });

    await userEvent.fill(textarea, "Updated notes");

    expect(scrollTo).toHaveBeenLastCalledWith(window.scrollX, window.scrollY);

    scrollTo.mockRestore();
  });
});

function getAutoHeight(textarea: ReturnType<typeof page.getByRole>): number {
  const element = textarea.element() as HTMLTextAreaElement;

  return Number.parseFloat(element.style.getPropertyValue("--_height"));
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
    await expect
      .element(screen.container.querySelector<HTMLSpanElement>(".token.number")!)
      .toHaveTextContent("1");
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
