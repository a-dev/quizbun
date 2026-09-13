import { describe, expect, it } from "vitest";
import { page } from "vitest/browser";

import { AnswerHint } from "./answer-hint";

describe("AnswerHint", () => {
  it("states the answer-count rule for a single-choice Question", async () => {
    const screen = await page.render(<AnswerHint type="single-choice" id="single-answer-hint" />);

    await expect.element(screen.getByText("Select one")).toBeInTheDocument();
  });

  it("states the answer-count rule for a multiple-choice Question", async () => {
    const screen = await page.render(
      <AnswerHint type="multiple-choice" id="multiple-answer-hint" />,
    );

    await expect.element(screen.getByText("Select all that apply")).toBeInTheDocument();
  });

  // The Option group references the hint by id via `aria-describedby`; the
  // link resolves across DOM nesting, so the id must reach the rendered node.
  it("carries the id the Option group describes itself with", async () => {
    const screen = await page.render(<AnswerHint type="single-choice" id="single-answer-hint" />);

    await expect
      .element(screen.getByText("Select one"))
      .toHaveAttribute("id", "single-answer-hint");
  });
});
