import { hydrateRoot } from "react-dom/client";
import { renderToString } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import { page } from "vitest/browser";

import { renderMarkdownField } from "@/shared/lib/render";

import { MediaFigure } from "./media-figure";

const IMAGE_SRC =
  "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='2' height='1'/%3E";
const PENDING_IMAGE_SRC = "https://127.0.0.1:1/pending.png";

describe("MediaFigure", () => {
  it("uses lazy, asynchronous image decoding", async () => {
    const screen = await page.render(<MediaFigure src={IMAGE_SRC} alt="Cache tiers" />);
    const image = screen.getByRole("img", { name: "Cache tiers" });

    await expect.element(image).toHaveAttribute("loading", "lazy");
    await expect.element(image).toHaveAttribute("decoding", "async");
    await expect.element(image).not.toHaveAttribute("fetchpriority");
  });

  it("eagerly fetches a priority Image with high priority", async () => {
    const screen = await page.render(<MediaFigure src={IMAGE_SRC} alt="Cache tiers" priority />);
    const image = screen.getByRole("img", { name: "Cache tiers" });

    await expect.element(image).toHaveAttribute("loading", "eager");
    await expect.element(image).toHaveAttribute("fetchpriority", "high");
  });

  it("renders measured dimensions so the browser reserves the Image aspect ratio", async () => {
    const screen = await page.render(
      <MediaFigure src={PENDING_IMAGE_SRC} alt="Cache tiers" width={640} height={360} />,
    );
    const image = screen.getByRole("img", { name: "Cache tiers" });

    await expect.element(image).toHaveAttribute("width", "640");
    await expect.element(image).toHaveAttribute("height", "360");

    const bounds = image.element().getBoundingClientRect();
    expect(bounds.width).toBeGreaterThan(0);
    expect(bounds.width / bounds.height).toBeCloseTo(16 / 9, 2);
  });

  it("bounds an unmeasured Image until it loads", async () => {
    const screen = await page.render(<MediaFigure src={PENDING_IMAGE_SRC} alt="Cache tiers" />);
    const image = screen.getByRole("img", { name: "Cache tiers" });

    await expect.element(image).toHaveAttribute("data-size-pending");
    expect(getComputedStyle(image.element()).aspectRatio).toBe("16 / 9");

    image.element().dispatchEvent(new Event("load"));

    await expect.element(image).not.toHaveAttribute("data-size-pending");
    expect(getComputedStyle(image.element()).aspectRatio).toBe("auto");
  });

  it("caps a portrait Image to the viewport while preserving its aspect ratio", async () => {
    const screen = await page.render(
      <MediaFigure src={PENDING_IMAGE_SRC} alt="Portrait diagram" width={600} height={1200} />,
    );
    const image = screen.getByRole("img", { name: "Portrait diagram" });
    const bounds = image.element().getBoundingClientRect();

    expect(bounds.height).toBeLessThanOrEqual(window.innerHeight * 0.7 + 1);
    expect(getComputedStyle(image.element()).objectFit).toBe("contain");

    // The box shrinks in both axes, so the capped Image leaves no gutters
    // beside itself inside a box that kept the uncapped width.
    expect(bounds.width / bounds.height).toBeCloseTo(600 / 1200, 2);
  });

  it("settles an Image that finished loading before the island hydrated", async () => {
    // The server-rendered Image can complete before hydration, and React never
    // fires `onLoad` for a `load` event that already happened. Hydrating over
    // settled markup is the only faithful way to reproduce that.
    const container = document.createElement("div");
    container.innerHTML = renderToString(<MediaFigure src={IMAGE_SRC} alt="Cache tiers" />);
    document.body.append(container);

    const image = container.querySelector("img")!;
    expect(image.dataset.sizePending).toBe("true");

    await new Promise((resolve) => {
      if (image.complete) resolve(undefined);
      else image.addEventListener("load", resolve, { once: true });
    });

    const root = hydrateRoot(container, <MediaFigure src={IMAGE_SRC} alt="Cache tiers" />);

    try {
      await vi.waitFor(() => expect(image.dataset.sizePending).toBeUndefined());
    } finally {
      root.unmount();
      container.remove();
    }
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
