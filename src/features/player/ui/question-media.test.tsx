import { describe, expect, it } from "vitest";
import { page } from "vitest/browser";

import type { Video } from "@/shared/lib/quiz";

import { QuestionMedia } from "./question-media";

const videos: Video[] = [
  { provider: "youtube", id: "dQw4w9WgXcQ" },
  { provider: "youtube", id: "M7lc1UVf-VE", placement: "explanation" },
];

describe("QuestionMedia", () => {
  it("treats an absent placement as Question media", async () => {
    const screen = await page.render(
      <QuestionMedia
        quizId="cache-hierarchy"
        questionTitle="Which **tier** answers the repeat read?"
        images={undefined}
        videos={videos}
        surface="question"
      />,
    );

    await expect.element(screen.getByRole("group", { name: "Question media" })).toBeInTheDocument();
    await expect
      .element(
        screen.getByRole("button", { name: "Play Video for Which tier answers the repeat read?" }),
      )
      .toBeInTheDocument();
  });

  it("renders only media assigned to the Explanation surface", async () => {
    const screen = await page.render(
      <QuestionMedia
        quizId="cache-hierarchy"
        questionTitle="Which tier answers the repeat read?"
        images={undefined}
        videos={videos}
        surface="explanation"
      />,
    );

    await expect
      .element(screen.getByRole("group", { name: "Explanation media" }))
      .toBeInTheDocument();
    await expect
      .element(
        screen.getByRole("button", {
          name: "Play Video for Which tier answers the repeat read?",
        }),
      )
      .toBeInTheDocument();
  });

  it("keeps Image order and renders Videos after Images", async () => {
    const screen = await page.render(
      <QuestionMedia
        quizId="cache-hierarchy"
        questionTitle="Which tier answers the repeat read?"
        images={[
          { src: "https://127.0.0.1:1/first.png", alt: "First diagram" },
          { src: "https://127.0.0.1:1/second.png", alt: "Second diagram" },
        ]}
        videos={[videos[0]!]}
        surface="question"
      />,
    );

    const firstImage = screen.getByRole("img", { name: "First diagram" }).element();
    const secondImage = screen.getByRole("img", { name: "Second diagram" }).element();
    const video = screen
      .getByRole("button", { name: "Play Video for Which tier answers the repeat read?" })
      .element();

    expect(firstImage.compareDocumentPosition(secondImage) & Node.DOCUMENT_POSITION_FOLLOWING).toBe(
      Node.DOCUMENT_POSITION_FOLLOWING,
    );
    expect(secondImage.compareDocumentPosition(video) & Node.DOCUMENT_POSITION_FOLLOWING).toBe(
      Node.DOCUMENT_POSITION_FOLLOWING,
    );
  });
});
