import { describe, it, expect, vi } from "vitest";
import { page, userEvent } from "vitest/browser";

import { Input, InputField } from "./input";

describe("Input", () => {
  it("renders a textbox and forwards typed input", async () => {
    const onChange = vi.fn();
    const screen = await page.render(<Input aria-label="Quiz title" onChange={onChange} />);

    const box = screen.getByRole("textbox", { name: "Quiz title" });
    await userEvent.fill(box, "Algorithms");

    await expect.element(box).toHaveValue("Algorithms");
    await expect(onChange).toHaveBeenCalled();
  });

  it("is not flagged invalid without an error", async () => {
    const screen = await page.render(<Input aria-label="Quiz title" />);
    await expect
      .element(screen.getByRole("textbox", { name: "Quiz title" }))
      .not.toHaveAttribute("aria-invalid", "true");
  });

  it("derives aria-invalid from the error prop", async () => {
    const screen = await page.render(<Input aria-label="Quiz title" error="Required" />);
    await expect
      .element(screen.getByRole("textbox", { name: "Quiz title" }))
      .toHaveAttribute("aria-invalid", "true");
  });
});

describe("InputField", () => {
  it("labels the input and links the error as its description", async () => {
    const screen = await page.render(
      <InputField label="Source" error="Source is required for published quizzes." />,
    );

    const box = screen.getByRole("textbox", { name: "Source" });
    await expect.element(box).toHaveAttribute("aria-invalid", "true");
    await expect
      .element(box)
      .toHaveAccessibleDescription("Source is required for published quizzes.");
  });

  it("renders no error message when none is provided", async () => {
    const screen = await page.render(<InputField label="Source" />);
    const box = screen.getByRole("textbox", { name: "Source" });
    await expect.element(box).not.toHaveAttribute("aria-invalid", "true");
    await expect.element(box).not.toHaveAttribute("aria-describedby");
  });
});
