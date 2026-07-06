import { useState } from "react";

import { describe, it, expect, vi } from "vitest";
import { page, userEvent } from "vitest/browser";

import { Combobox } from "./index";
import type { ComboboxValue } from "./types";

const options = [
  { value: "react", label: "React" },
  { value: "vitest", label: "Vitest" },
  { value: "astro", label: "Astro" },
];

function ComboboxExample({
  onChange,
  initialValue,
}: {
  onChange?: (value: ComboboxValue<string>) => void;
  initialValue?: ComboboxValue<string>;
}) {
  const [value, setValue] = useState<ComboboxValue<string>>(initialValue);
  return (
    <Combobox<string>
      placeholder="Select tags"
      options={options}
      value={value}
      onChange={(next) => {
        setValue(next);
        onChange?.(next);
      }}
    />
  );
}

describe("Combobox", () => {
  it("shows the placeholder when nothing is selected", async () => {
    const screen = await page.render(<ComboboxExample />);
    await expect.element(screen.getByText("Select tags")).toBeInTheDocument();
  });

  it("opens the dropdown and selects an option", async () => {
    const onChange = vi.fn();
    const screen = await page.render(<ComboboxExample onChange={onChange} />);

    await userEvent.click(screen.getByTestId("combobox-trigger"));
    await expect.element(page.getByTestId("combobox-popup")).toBeInTheDocument();

    await userEvent.click(page.getByRole("option", { name: "Vitest" }));

    await expect(onChange).toHaveBeenCalled();
    // The selected value renders back as a chip inside the trigger.
    await expect
      .element(page.getByTestId("combobox-trigger").getByText("Vitest"))
      .toBeInTheDocument();
  });

  it("closes the dropdown when its trigger is clicked again", async () => {
    const screen = await page.render(<ComboboxExample />);

    await userEvent.click(screen.getByTestId("combobox-trigger"));
    await expect.element(page.getByTestId("combobox-popup")).toBeInTheDocument();

    await userEvent.click(screen.getByTestId("combobox-trigger"));
    await expect.element(page.getByTestId("combobox-popup")).not.toBeInTheDocument();
  });

  it("opens the overflow popover without opening the main dropdown", async () => {
    const screen = await page.render(<ComboboxExample initialValue={options} />);

    await userEvent.click(screen.getByTestId("combobox-overflow-trigger"));

    await expect.element(page.getByTestId("ui-popover-popup")).toBeInTheDocument();
    await expect.element(page.getByTestId("ui-popover-popup")).toHaveTextContent("Astro");
    await expect.element(page.getByTestId("combobox-popup")).not.toBeInTheDocument();
  });

  it("layers the overflow popover above an open main dropdown", async () => {
    const screen = await page.render(<ComboboxExample initialValue={options} />);

    await userEvent.click(screen.getByTestId("combobox-trigger"));
    await expect.element(page.getByTestId("combobox-popup")).toBeInTheDocument();

    await userEvent.click(screen.getByTestId("combobox-overflow-trigger"));

    const mainPopup = page.getByTestId("combobox-popup");
    const overflowPopover = page.getByTestId("ui-popover-popup");

    await expect.element(mainPopup).toBeInTheDocument();
    await expect.element(overflowPopover).toBeInTheDocument();

    await expect
      .poll(() => {
        const main = mainPopup.element();
        const popover = overflowPopover.element();
        const a = main.getBoundingClientRect();
        const b = popover.getBoundingClientRect();
        const left = Math.max(a.left, b.left);
        const right = Math.min(a.right, b.right);
        const top = Math.max(a.top, b.top);
        const bottom = Math.min(a.bottom, b.bottom);
        if (left >= right || top >= bottom) return "popups do not overlap";
        const hit = document.elementFromPoint((left + right) / 2, (top + bottom) / 2);
        if (popover.contains(hit)) return "overflow popover on top";
        if (main.contains(hit)) return "main dropdown on top";
        return "hit neither popup";
      })
      .toBe("overflow popover on top");
  });

  it("fuzzy-filters the options from the search input", async () => {
    const screen = await page.render(<ComboboxExample />);

    await userEvent.click(screen.getByTestId("combobox-trigger"));
    await expect.element(page.getByTestId("combobox-popup")).toBeInTheDocument();

    await userEvent.fill(page.getByTestId("combobox-search-input"), "vt");

    const popup = page.getByTestId("combobox-popup");
    await expect.element(popup).toHaveTextContent("Vitest");
    await expect.element(popup).not.toHaveTextContent("React");
  });

  it("shows the fixed empty state when fuzzy search finds no options", async () => {
    const screen = await page.render(<ComboboxExample />);

    await userEvent.click(screen.getByTestId("combobox-trigger"));
    await userEvent.fill(page.getByTestId("combobox-search-input"), "xyz");

    await expect.element(page.getByText("No results found")).toBeInTheDocument();
  });
});
