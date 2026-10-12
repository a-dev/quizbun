import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { page } from "vitest/browser";

import type { Quiz } from "@/shared/lib/quiz";
import { MAX_IMPORT_BYTES } from "@/shared/lib/quiz";
import { encodeQuizLink } from "@/shared/lib/quiz-link";
import { saveQuiz } from "@/shared/lib/storage";

import { ImportQuizForm } from "./import-quiz-form";

function makeQuiz(id: string, questionCount = 1): Quiz {
  return {
    schemaVersion: 1,
    id,
    title: `Linked quiz ${id}`,
    tags: ["test"],
    questions: Array.from({ length: questionCount }, (_, index) => ({
      id: `question-${index}`,
      type: "single-choice" as const,
      title: `Question ${index}?`,
      explanation: "Because.",
      options: [
        { text: "Yes", isCorrect: true },
        { text: "No", isCorrect: false },
      ],
    })),
  };
}

async function linkTo(quiz: Quiz) {
  return `#qos=${await encodeQuizLink(JSON.stringify(quiz))}`;
}

const originalUrl = window.location.href;

beforeEach(() => window.history.replaceState(null, "", originalUrl.split("#")[0]));
afterEach(() => window.history.replaceState(null, "", originalUrl.split("#")[0]));

describe("ImportQuizForm Quiz link", () => {
  it("shows the preview for a valid link and removes the fragment from the URL", async () => {
    window.location.hash = await linkTo(makeQuiz("link-valid"));

    const screen = await page.render(<ImportQuizForm />);

    await expect
      .element(screen.getByRole("article", { name: "Linked quiz link-valid" }))
      .toBeVisible();
    await expect.element(screen.getByRole("button", { name: "Save to Library" })).toBeVisible();
    expect(window.location.hash).toBe("");
    // The textarea preserves the received JSON, as a paste would.
    await expect
      .element(screen.getByRole("textbox"))
      .toHaveValue(JSON.stringify(makeQuiz("link-valid")));
  });

  it("previews and revalidates a link whose JSON exactly meets the Import size limit", async () => {
    const quiz = makeQuiz("link-size-limit");
    quiz.description = "";
    quiz.description = "x".repeat(
      MAX_IMPORT_BYTES - new TextEncoder().encode(JSON.stringify(quiz)).byteLength,
    );
    const json = JSON.stringify(quiz);

    expect(new TextEncoder().encode(json).byteLength).toBe(MAX_IMPORT_BYTES);
    expect(new TextEncoder().encode(JSON.stringify(quiz, null, 2)).byteLength).toBeGreaterThan(
      MAX_IMPORT_BYTES,
    );
    window.location.hash = await linkTo(quiz);

    const screen = await page.render(<ImportQuizForm />);
    const saveButton = screen.getByRole("button", { name: "Save to Library" });

    await expect.element(saveButton).toBeVisible();
    await expect.element(screen.getByRole("textbox")).toHaveValue(json);
    await screen.getByRole("button", { name: "Validate", exact: true }).click();
    await expect.element(saveButton).toBeVisible();
  });

  it("reports a damaged link and leaves the textarea empty", async () => {
    window.location.hash = "#qos=1.AAAAAAAAAAAAAAAA";

    const screen = await page.render(<ImportQuizForm />);

    await expect
      .poll(() => screen.getByRole("alert").element().textContent)
      .toMatch(/damaged or incomplete/);
    await expect.element(screen.getByRole("textbox")).toHaveValue("");
  });

  it("tells the Creator to update when the link version is unknown", async () => {
    window.location.hash = "#qos=2.abc";

    const screen = await page.render(<ImportQuizForm />);

    await expect
      .poll(() => screen.getByRole("alert").element().textContent)
      .toMatch(/Update the quizbun skill or Import the file/);
  });

  it("shows the Question-count report for a link to 201 Questions, like a paste", async () => {
    window.location.hash = await linkTo(makeQuiz("link-too-many", 201));

    const screen = await page.render(<ImportQuizForm />);

    await expect
      .poll(() => screen.getByRole("alert").element().textContent)
      .toMatch(/201 Questions; Quizbun imports up to 200/);
  });

  it("loads a second Quiz when the hash changes on the page", async () => {
    const screen = await page.render(<ImportQuizForm />);

    window.location.hash = await linkTo(makeQuiz("link-first"));
    await expect
      .element(screen.getByRole("article", { name: "Linked quiz link-first" }))
      .toBeVisible();

    window.location.hash = await linkTo(makeQuiz("link-second"));
    await expect
      .element(screen.getByRole("article", { name: "Linked quiz link-second" }))
      .toBeVisible();
  });

  it("opens the collision dialog on Save when the id already exists", async () => {
    await saveQuiz(makeQuiz("link-collision"));
    window.location.hash = await linkTo(makeQuiz("link-collision"));

    const screen = await page.render(<ImportQuizForm />);

    await screen.getByRole("button", { name: "Save to Library" }).click();

    await expect
      .element(page.getByRole("dialog", { name: "A quiz with this id already exists" }))
      .toBeVisible();
  });
});
