import { describe, it, expect } from "vitest";
import { page } from "vitest/browser";

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
    await expect.element(screen.getByRole("alert")).toHaveTextContent("Import failed.");
  });

  it("merges a custom className with its own classes", async () => {
    const screen = await page.render(
      <Note type="info" className="custom-note" data-testid="note">
        Heads up.
      </Note>,
    );
    await expect.element(screen.getByTestId("note")).toHaveClass("custom-note");
  });
});
