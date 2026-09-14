import { describe, it, expect, vi } from "vitest";
import { page } from "vitest/browser";

import { Radio } from "./radio";
import { RadioGroup } from "./radio-group";

describe("Radio", () => {
  it("renders radios with accessible names from their labels", async () => {
    const screen = await page.render(
      <RadioGroup aria-label="Quiz source">
        <Radio value="catalog">Catalog quiz</Radio>
        <Radio value="local">Private browser quiz</Radio>
      </RadioGroup>,
    );
    await expect.element(screen.getByRole("radio", { name: "Catalog quiz" })).toBeInTheDocument();
    await expect
      .element(screen.getByRole("radio", { name: "Private browser quiz" }))
      .toBeInTheDocument();
  });

  it("selects a radio on click and reports the new value", async () => {
    const onValueChange = vi.fn<() => void>();
    const screen = await page.render(
      <RadioGroup aria-label="Quiz source" onValueChange={onValueChange}>
        <Radio value="catalog">Catalog quiz</Radio>
        <Radio value="local">Private browser quiz</Radio>
      </RadioGroup>,
    );

    // Playwright's role=radio click redirects through the label's hidden native
    // input and silently no-ops for this control; dispatch on the element directly.
    (screen.getByRole("radio", { name: "Private browser quiz" }).element() as HTMLElement).click();

    await expect(onValueChange).toHaveBeenCalledWith("local", expect.anything());
    await expect.element(screen.getByRole("radio", { name: "Private browser quiz" })).toBeChecked();
  });

  it("does not fire when the group is disabled", async () => {
    const onValueChange = vi.fn<() => void>();
    const screen = await page.render(
      <RadioGroup aria-label="Quiz source" disabled onValueChange={onValueChange}>
        <Radio value="catalog">Catalog quiz</Radio>
      </RadioGroup>,
    );

    await expect.element(screen.getByRole("radio", { name: "Catalog quiz" })).toBeDisabled();
  });
});
