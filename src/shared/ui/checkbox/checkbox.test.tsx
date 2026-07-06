import { describe, it, expect, vi } from "vitest";
import { page, userEvent } from "vitest/browser";

import { Checkbox } from "./checkbox";
import { CheckboxGroup } from "./checkbox-group";

describe("Checkbox", () => {
  it("renders a checkbox with an accessible name from its label", async () => {
    const screen = await page.render(<Checkbox value="explanations">Show explanations</Checkbox>);
    await expect
      .element(screen.getByRole("checkbox", { name: "Show explanations" }))
      .toBeInTheDocument();
  });

  it("toggles checked state on click", async () => {
    const onCheckedChange = vi.fn();
    const screen = await page.render(
      <Checkbox value="explanations" onCheckedChange={onCheckedChange}>
        Show explanations
      </Checkbox>,
    );

    const box = screen.getByRole("checkbox", { name: "Show explanations" });
    await userEvent.click(box);

    await expect(onCheckedChange).toHaveBeenCalledWith(true, expect.anything());
    await expect.element(box).toBeChecked();
  });

  it("reflects the disabled prop", async () => {
    const screen = await page.render(
      <Checkbox value="explanations" disabled>
        Show explanations
      </Checkbox>,
    );
    await expect
      .element(screen.getByRole("checkbox", { name: "Show explanations" }))
      .toBeDisabled();
  });
});

describe("CheckboxGroup", () => {
  it("styles each label as disabled when the group is disabled", async () => {
    const screen = await page.render(
      <CheckboxGroup aria-label="Review filters" disabled>
        <Checkbox value="explanations">With explanations</Checkbox>
      </CheckboxGroup>,
    );

    const checkbox = screen.getByRole("checkbox", { name: "With explanations" });
    const label = checkbox.element().parentElement;

    expect(getComputedStyle(label!).cursor).toBe("auto");
  });

  it("reports the full set of selected values as members toggle", async () => {
    const onValueChange = vi.fn();
    const screen = await page.render(
      <CheckboxGroup
        aria-label="Review filters"
        allValues={["explanations", "incorrect"]}
        defaultValue={["explanations"]}
        onValueChange={onValueChange}
      >
        <Checkbox value="explanations">With explanations</Checkbox>
        <Checkbox value="incorrect">Incorrect answers</Checkbox>
      </CheckboxGroup>,
    );

    await userEvent.click(screen.getByRole("checkbox", { name: "Incorrect answers" }));

    await expect(onValueChange).toHaveBeenCalledWith(
      ["explanations", "incorrect"],
      expect.anything(),
    );
  });
});
