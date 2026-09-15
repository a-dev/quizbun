import { describe, it, expect, vi } from "vitest";
import { page, userEvent } from "vitest/browser";

import { Note } from "./note";

describe("Note", () => {
  it("renders its children", async () => {
    const screen = await page.render(<Note type="info">Stored only in this browser.</Note>);
    await expect.element(screen.getByText("Stored only in this browser.")).toBeInTheDocument();
  });

  it.each([
    ["info", "Information:"],
    ["warning", "Warning:"],
    ["error", "Error:"],
    ["success", "Success:"],
  ] as const)("exposes a screen-reader severity label for %s notes", async (type, label) => {
    const screen = await page.render(<Note type={type}>A message.</Note>);
    await expect.element(screen.getByText(label)).toBeInTheDocument();
  });

  it("can opt into live-region semantics via forwarded attributes", async () => {
    const screen = await page.render(
      <Note type="error" role="alert" data-testid="note">
        Import failed.
      </Note>,
    );
    await expect.element(screen.getByTestId("note")).toHaveAttribute("role", "alert");
    await expect.element(screen.getByRole("alert")).toMatchTextContent("Import failed.");
  });

  it("merges a custom className with its own classes", async () => {
    const screen = await page.render(
      <Note type="info" className="custom-note" data-testid="note">
        Heads up.
      </Note>,
    );
    await expect.element(screen.getByTestId("note")).toHaveClass("custom-note");
  });

  it("does not render a close button without an onClose callback", async () => {
    const screen = await page.render(<Note type="info">Heads up.</Note>);
    await expect
      .element(screen.getByRole("button", { name: "Close note" }))
      .not.toBeInTheDocument();
  });

  it("renders a close button and calls onClose when activated", async () => {
    const onClose = vi.fn<() => void>();
    const screen = await page.render(
      <div style={{ paddingBlockStart: "1rem" }}>
        <Note type="info" onClose={onClose}>
          Heads up.
        </Note>
      </div>,
    );

    await userEvent.click(screen.getByRole("button", { name: "Close note" }));

    await expect(onClose).toHaveBeenCalledOnce();
  });
});
