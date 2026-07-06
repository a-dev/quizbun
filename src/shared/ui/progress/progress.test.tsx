import { describe, it, expect } from "vitest";
import { page } from "vitest/browser";

import { Progress } from "./progress";

describe("Progress", () => {
  it("renders the label and the formatted percentage value", async () => {
    const screen = await page.render(<Progress value={40} label="Loading quizzes" />);
    await expect.element(screen.getByText("Loading quizzes")).toBeInTheDocument();
    await expect.element(screen.getByText("40%")).toBeInTheDocument();
  });

  it("exposes the current value through the progressbar role", async () => {
    const screen = await page.render(<Progress value={40} label="Loading quizzes" />);
    await expect.element(screen.getByRole("progressbar")).toHaveAttribute("aria-valuenow", "40");
  });
});
