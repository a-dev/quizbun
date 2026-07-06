import { describe, it, expect, vi } from "vitest";
import { page } from "vitest/browser";

import { BackButton } from "./back-button";

describe("BackButton", () => {
  it("renders a link pointing at the given href", async () => {
    const screen = await page.render(<BackButton href="/library/" />);
    await expect
      .element(screen.getByRole("link", { name: "Back" }))
      .toHaveAttribute("href", "/library/");
  });

  it("renders custom link text", async () => {
    const screen = await page.render(<BackButton href="/library/" text="All quizzes" />);
    await expect.element(screen.getByRole("link", { name: "All quizzes" })).toBeInTheDocument();
  });

  it("renders a button when given onClick", async () => {
    const screen = await page.render(<BackButton onClick={() => {}} text="Back to quiz" />);
    const button = screen.getByRole("button", { name: "Back to quiz" });
    await expect.element(button).toBeInTheDocument();
    await expect.element(button).toHaveAttribute("type", "button");
  });

  it("calls onClick when the button is activated", async () => {
    const onClick = vi.fn();
    const screen = await page.render(<BackButton onClick={onClick} />);
    await screen.getByRole("button", { name: "Back" }).click();
    expect(onClick).toHaveBeenCalledOnce();
  });
});
