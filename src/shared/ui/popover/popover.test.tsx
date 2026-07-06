import { describe, it, expect } from "vitest";
import { page, userEvent } from "vitest/browser";

import { Popover } from "./popover";

describe("Popover", () => {
  it("reveals its content when the trigger is activated", async () => {
    const screen = await page.render(
      <Popover
        trigger={<button type="button">Details</button>}
        triggerIsNativeButton
        openOnHover={false}
      >
        <p>Explanation body</p>
      </Popover>,
    );

    await userEvent.click(screen.getByRole("button", { name: "Details" }));

    await expect.element(page.getByText("Explanation body")).toBeInTheDocument();
  });

  it("hides its content again when closed via the close button", async () => {
    const screen = await page.render(
      <Popover
        trigger={<button type="button">Details</button>}
        triggerIsNativeButton
        openOnHover={false}
        showCloseButton
      >
        <p>Explanation body</p>
      </Popover>,
    );

    await userEvent.click(screen.getByRole("button", { name: "Details" }));
    await expect.element(page.getByTestId("ui-popover-popup")).toBeInTheDocument();

    await userEvent.click(page.getByRole("button", { name: "Close" }));

    await expect.element(page.getByText("Explanation body")).not.toBeInTheDocument();
  });
});
