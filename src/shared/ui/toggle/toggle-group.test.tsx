import { describe, it, expect, vi } from "vitest";
import { page, userEvent } from "vitest/browser";

import { Toggle } from "./toggle";
import { ToggleGroup } from "./toggle-group";

describe("ToggleGroup", () => {
  it("renders with group role", async () => {
    const screen = await page.render(
      <ToggleGroup aria-label="Text align">
        <Toggle value="left" aria-label="Left">
          ←
        </Toggle>
        <Toggle value="right" aria-label="Right">
          →
        </Toggle>
      </ToggleGroup>,
    );
    await expect.element(screen.getByRole("group", { name: "Text align" })).toBeInTheDocument();
  });

  it("single-select: pressing one unpresses the other", async () => {
    const onChange = vi.fn();
    const screen = await page.render(
      <ToggleGroup defaultValue={["left"]} onValueChange={onChange} aria-label="Text align">
        <Toggle value="left" aria-label="Left">
          ←
        </Toggle>
        <Toggle value="right" aria-label="Right">
          →
        </Toggle>
      </ToggleGroup>,
    );
    await userEvent.click(screen.getByRole("button", { name: "Right" }));
    await expect(onChange).toHaveBeenCalledWith(["right"], expect.anything());
  });

  it("multi-select: multiple items can be pressed", async () => {
    const onChange = vi.fn();
    const screen = await page.render(
      <ToggleGroup multiple defaultValue={["bold"]} onValueChange={onChange} aria-label="Format">
        <Toggle value="bold" aria-label="Bold">
          B
        </Toggle>
        <Toggle value="italic" aria-label="Italic">
          I
        </Toggle>
      </ToggleGroup>,
    );
    await userEvent.click(screen.getByRole("button", { name: "Italic" }));
    await expect(onChange).toHaveBeenCalledWith(["bold", "italic"], expect.anything());
  });
});
