import { describe, it, expect, vi } from "vitest";
import { page, userEvent } from "vitest/browser";

import { Dialog } from "./dialog";

describe("Dialog", () => {
  it("opens from its trigger and exposes the title and description", async () => {
    const screen = await page.render(
      <Dialog
        trigger={<button type="button">Open</button>}
        triggerIsNativeButton
        title="Delete this Run?"
        description="This clears your saved progress."
      />,
    );

    await userEvent.click(screen.getByRole("button", { name: "Open" }));

    await expect
      .element(page.getByRole("heading", { name: "Delete this Run?" }))
      .toBeInTheDocument();
    await expect.element(page.getByText("This clears your saved progress.")).toBeInTheDocument();
  });

  it("closes via the close button and fires onClose", async () => {
    const onClose = vi.fn();
    const screen = await page.render(
      <Dialog
        trigger={<button type="button">Open</button>}
        triggerIsNativeButton
        title="Heads up"
        onClose={onClose}
      />,
    );

    await userEvent.click(screen.getByRole("button", { name: "Open" }));
    await expect.element(page.getByRole("heading", { name: "Heads up" })).toBeInTheDocument();

    await userEvent.click(page.getByRole("button", { name: "Close" }));

    await expect.element(page.getByRole("heading", { name: "Heads up" })).not.toBeInTheDocument();
    await expect(onClose).toHaveBeenCalled();
  });

  it("omits the close button when showCloseButton is false", async () => {
    const screen = await page.render(
      <Dialog
        trigger={<button type="button">Open</button>}
        triggerIsNativeButton
        title="No close"
        showCloseButton={false}
      />,
    );

    await userEvent.click(screen.getByRole("button", { name: "Open" }));
    await expect.element(page.getByRole("heading", { name: "No close" })).toBeInTheDocument();
    await expect.element(page.getByRole("button", { name: "Close" })).not.toBeInTheDocument();
  });
});
