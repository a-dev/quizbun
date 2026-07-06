import { describe, it, expect, vi } from "vitest";
import { page, userEvent } from "vitest/browser";

import { Select } from "./select";

const fruits = [
  { label: "Gala", value: "gala" },
  { label: "Fuji", value: "fuji" },
  { label: "Honeycrisp", value: "honeycrisp" },
] as const;

function SelectExample({
  onValueChange,
}: {
  onValueChange?: (value: string | null, eventDetails: unknown) => void;
}) {
  return (
    <Select items={fruits} defaultValue="fuji" trigger="Select fruit" onValueChange={onValueChange}>
      {fruits.map((item) => (
        <Select.Item key={item.value} value={item.value}>
          {item.label}
        </Select.Item>
      ))}
    </Select>
  );
}

describe("Select", () => {
  it("reflects the default value on the trigger", async () => {
    const screen = await page.render(<SelectExample />);
    await expect.element(screen.getByText("Fuji")).toBeInTheDocument();
  });

  it("opens the listbox and selects an option", async () => {
    const onValueChange = vi.fn();
    const screen = await page.render(<SelectExample onValueChange={onValueChange} />);

    await userEvent.click(screen.getByText("Fuji"));
    await expect.element(page.getByRole("listbox")).toBeInTheDocument();

    await userEvent.click(page.getByRole("option", { name: "Gala" }));

    await expect(onValueChange).toHaveBeenCalledWith("gala", expect.anything());
  });
});
