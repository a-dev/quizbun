import { describe, expect, it } from "vitest";

import { quizSchema } from "../quiz";
import { listDocExamples, parseExampleDescriptions } from "./examples";

describe("parseExampleDescriptions", () => {
  it("maps file names to their one-line descriptions", () => {
    const readme = [
      "## What Each Example Demonstrates",
      "",
      "- [a-quiz.json](./a-quiz.json): shows the simplest shape.",
      "- [b-quiz.json](./b-quiz.json): shows tolerance handling.",
      "- [not-json.md](./not-json.md): a prompt template, not an example quiz.",
    ].join("\n");

    const descriptions = parseExampleDescriptions(readme);

    expect(descriptions.get("a-quiz.json")).toBe("shows the simplest shape.");
    expect(descriptions.get("b-quiz.json")).toBe("shows tolerance handling.");
    expect(descriptions.size).toBe(2);
  });
});

describe("listDocExamples", () => {
  it("returns every committed example with a description and valid JSON", () => {
    const examples = listDocExamples();

    expect(examples.length).toBeGreaterThanOrEqual(4);

    for (const example of examples) {
      expect(example.description.length).toBeGreaterThan(0);
      expect(quizSchema.safeParse(JSON.parse(example.json)).success).toBe(true);
    }
  });
});
