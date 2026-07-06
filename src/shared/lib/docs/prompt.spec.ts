import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

import { quizSchema } from "../quiz";
import { extractPromptText } from "./prompt";

const promptDocSource = readFileSync(
  resolve(process.cwd(), "docs/quiz-generation-prompt.md"),
  "utf8",
);

const publishedSchema = JSON.parse(
  readFileSync(resolve(process.cwd(), "public/schema/quiz.v1.json"), "utf8"),
);

function extractFencedJsonBlocks(text: string): string[] {
  return [...text.matchAll(/```json\n([\s\S]*?)```/g)].map((match) => match[1] ?? "");
}

describe("extractPromptText", () => {
  const promptText = extractPromptText(promptDocSource);

  it("starts with the prompt instructions, not the document intro", () => {
    expect(promptText.startsWith("Generate exactly one Quiz as strict JSON.")).toBe(true);
    expect(promptText).not.toContain("## Prompt");
  });

  it("contains the published JSON Schema verbatim", () => {
    const [schemaBlock] = extractFencedJsonBlocks(promptText);

    expect(schemaBlock).toBeDefined();
    expect(JSON.parse(schemaBlock ?? "")).toEqual(publishedSchema);
  });

  it("contains a canonical example that validates against the Standard", () => {
    const [, exampleBlock] = extractFencedJsonBlocks(promptText);

    expect(exampleBlock).toBeDefined();

    const result = quizSchema.safeParse(JSON.parse(exampleBlock ?? ""));

    expect(result.success).toBe(true);
  });

  it("throws when the prompt heading is missing", () => {
    expect(() => extractPromptText("# No prompt here\n\nJust text.")).toThrow(
      /no "## Prompt" heading/,
    );
  });
});
