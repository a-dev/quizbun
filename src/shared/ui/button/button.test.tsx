import { describe, it, expect, vi } from "vitest";
import { page, userEvent } from "vitest/browser";

import { Button, LinkAsButton } from "./button";

describe("Button", () => {
  it("renders a button with its label", async () => {
    const screen = await page.render(<Button>Start quiz</Button>);
    await expect.element(screen.getByRole("button", { name: "Start quiz" })).toBeInTheDocument();
  });

  it("calls onClick when activated", async () => {
    const onClick = vi.fn();
    const screen = await page.render(<Button onClick={onClick}>Start quiz</Button>);
    await userEvent.click(screen.getByRole("button", { name: "Start quiz" }));
    await expect(onClick).toHaveBeenCalledOnce();
  });

  it("reflects the disabled prop", async () => {
    const screen = await page.render(<Button disabled>Start quiz</Button>);
    await expect.element(screen.getByRole("button", { name: "Start quiz" })).toBeDisabled();
  });
});

describe("LinkAsButton", () => {
  it("renders an anchor pointing at href", async () => {
    const screen = await page.render(<LinkAsButton href="/library/">Library</LinkAsButton>);
    await expect
      .element(screen.getByRole("link", { name: "Library" }))
      .toHaveAttribute("href", "/library/");
  });

  it("communicates disabled state through aria-disabled", async () => {
    const screen = await page.render(
      <LinkAsButton href="/library/" disabled>
        Library
      </LinkAsButton>,
    );
    await expect
      .element(screen.getByRole("link", { name: "Library" }))
      .toHaveAttribute("aria-disabled", "true");
  });
});
