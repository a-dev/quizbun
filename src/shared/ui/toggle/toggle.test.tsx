import { describe, it, expect, vi } from "vitest";
import { page, userEvent } from "vitest/browser";

import { Toggle } from "./toggle";

describe("Toggle", () => {
  it("renders with button role", async () => {
    const screen = await page.render(<Toggle aria-label="Bold">B</Toggle>);
    await expect.element(screen.getByRole("button", { name: "Bold" })).toBeInTheDocument();
  });

  it("reflects unpressed state via aria-pressed", async () => {
    const screen = await page.render(<Toggle aria-label="Bold">B</Toggle>);
    await expect
      .element(screen.getByRole("button", { name: "Bold" }))
      .toHaveAttribute("aria-pressed", "false");
  });

  it("reflects pressed state via aria-pressed", async () => {
    const screen = await page.render(
      <Toggle aria-label="Bold" defaultPressed>
        B
      </Toggle>,
    );
    await expect
      .element(screen.getByRole("button", { name: "Bold" }))
      .toHaveAttribute("aria-pressed", "true");
  });

  it("toggles pressed on click", async () => {
    const onPressedChange = vi.fn();
    const screen = await page.render(
      <Toggle aria-label="Bold" onPressedChange={onPressedChange}>
        B
      </Toggle>,
    );
    await userEvent.click(screen.getByRole("button", { name: "Bold" }));
    await expect(onPressedChange).toHaveBeenCalledWith(true, expect.anything());
  });
});
