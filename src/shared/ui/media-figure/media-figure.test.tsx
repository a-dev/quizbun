import { describe, expect, it } from "vitest";
import { page } from "vitest/browser";

import { renderMarkdownField } from "@/shared/lib/render";

import { MediaFigure } from "./media-figure";

const IMAGE_SRC =
  "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='2' height='1'/%3E";

describe("MediaFigure", () => {
  it("uses lazy, asynchronous image decoding", async () => {
    const screen = await page.render(<MediaFigure src={IMAGE_SRC} alt="Cache tiers" />);
    const image = screen.getByRole("img", { name: "Cache tiers" });

    await expect.element(image).toHaveAttribute("loading", "lazy");
    await expect.element(image).toHaveAttribute("decoding", "async");
  });

  it("replaces a failed Image with a visible alt-text placeholder", async () => {
    const screen = await page.render(<MediaFigure src={IMAGE_SRC} alt="Three cache tiers" />);
    const image = screen.getByRole("img", { name: "Three cache tiers" });

    image.element().dispatchEvent(new Event("error"));

    const placeholder = screen.getByRole("img", { name: "Three cache tiers" });
    await expect.element(placeholder).toHaveTextContent("Three cache tiers");
    expect(placeholder.element().tagName).toBe("DIV");
  });

  it("renders the caption HTML it was handed", async () => {
    const screen = await page.render(
      <MediaFigure
        src={IMAGE_SRC}
        alt="Cache tiers"
        captionHtml={renderMarkdownField("imageCaption", "Diagram by **J. Doe**.")}
      />,
    );

    const caption = screen.container.querySelector("figcaption");
    expect(caption).not.toBeNull();
    await expect.element(caption!).toHaveTextContent("Diagram by J. Doe.");
    expect(caption!.querySelector("strong")?.textContent).toBe("J. Doe");
  });
});
