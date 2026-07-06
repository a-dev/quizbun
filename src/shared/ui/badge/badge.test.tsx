import { describe, it, expect } from "vitest";
import { page } from "vitest/browser";

import { Badge } from "./badge";

describe("Badge", () => {
  it("renders its children", async () => {
    const screen = await page.render(<Badge>algorithms</Badge>);
    await expect.element(screen.getByText("algorithms")).toBeInTheDocument();
  });

  it("forwards arbitrary HTML attributes", async () => {
    const screen = await page.render(
      <Badge data-testid="badge" title="Taxonomy tag">
        tag
      </Badge>,
    );
    await expect.element(screen.getByTestId("badge")).toHaveAttribute("title", "Taxonomy tag");
  });

  it("merges a custom className with its own classes", async () => {
    const screen = await page.render(
      <Badge className="custom-badge" data-testid="badge">
        tag
      </Badge>,
    );
    await expect.element(screen.getByTestId("badge")).toHaveClass("custom-badge");
  });
});
