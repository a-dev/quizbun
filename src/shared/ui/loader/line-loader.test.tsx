import { describe, it, expect } from "vitest";
import { page } from "vitest/browser";

import { LineLoader, TopLineLoader } from "./line-loader";

describe("LineLoader", () => {
  it("renders the loader bar", async () => {
    const screen = await page.render(<LineLoader />);
    await expect.element(screen.getByTestId("line-loader")).toBeInTheDocument();
  });
});

describe("TopLineLoader", () => {
  it("portals a loader bar into the document after mount", async () => {
    await page.render(<TopLineLoader />);
    await expect.element(page.getByTestId("line-loader")).toBeInTheDocument();
  });
});
