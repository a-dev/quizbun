import { describe, expect, it } from "vitest";
import { page, userEvent } from "vitest/browser";

import { YouTubeEmbed } from "./youtube-embed";

describe("YouTubeEmbed", () => {
  it("does not create an iframe before the learner clicks", async () => {
    const screen = await page.render(
      <YouTubeEmbed videoId="dQw4w9WgXcQ" title="Video for cache hierarchy" start={90} />,
    );

    await expect
      .element(screen.getByRole("button", { name: "Play Video for cache hierarchy" }))
      .toBeInTheDocument();
    expect(screen.container.querySelector("iframe")).toBeNull();
  });

  it("swaps the facade for the exact privacy-enhanced embed URL", async () => {
    const screen = await page.render(
      <YouTubeEmbed videoId="dQw4w9WgXcQ" title="Video for cache hierarchy" start={90} />,
    );

    await userEvent.click(screen.getByRole("button", { name: "Play Video for cache hierarchy" }));

    const iframe = screen.getByTitle("Video for cache hierarchy");
    await expect
      .element(iframe)
      .toHaveAttribute(
        "src",
        "https://www.youtube-nocookie.com/embed/dQw4w9WgXcQ?start=90&autoplay=1",
      );
  });
});
