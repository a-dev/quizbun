import { describe, expect, test } from "vitest";

import { computeContentHash } from "./content-hash";
import type { InputQuestion, Question, SingleChoiceQuestion } from "./schema";

const choiceQuestion: SingleChoiceQuestion = {
  id: "capital",
  type: "single-choice",
  title: "Capital of France?",
  explanation: "Paris has been the capital since 987.",
  references: "Read [the history](https://example.com/history).",
  options: [
    { text: "Paris", isCorrect: true },
    { text: "Lyon", isCorrect: false },
  ],
};

const inputQuestion: InputQuestion = {
  id: "sum",
  type: "input",
  title: "2 + 2 = ?",
  explanation: "Basic arithmetic.",
  validation: { mode: "numeric", acceptedAnswers: [4] },
};

describe("computeContentHash", () => {
  test("is a 64-char lowercase hex string", async () => {
    expect(await computeContentHash(choiceQuestion)).toMatch(/^[0-9a-f]{64}$/);
  });

  test("identical content gives identical hashes", async () => {
    const clone = structuredClone(choiceQuestion);

    expect(await computeContentHash(clone)).toBe(await computeContentHash(choiceQuestion));
  });

  test("is independent of object key order", async () => {
    const reordered = JSON.parse(
      `{"options":[{"isCorrect":true,"text":"Paris"},{"text":"Lyon","isCorrect":false}],` +
        `"explanation":"Paris has been the capital since 987.",` +
        `"references":"Read [the history](https://example.com/history).",` +
        `"title":"Capital of France?","type":"single-choice","id":"capital"}`,
    ) as Question;

    expect(await computeContentHash(reordered)).toBe(await computeContentHash(choiceQuestion));
  });

  test.each<[string, (question: SingleChoiceQuestion) => void]>([
    ["prompt", (question) => (question.title = "Capital of Germany?")],
    ["option text", (question) => (question.options[1]!.text = "Marseille")],
    ["option order", (question) => void question.options.reverse()],
    ["correct option", (question) => (question.options[0]!.isCorrect = false)],
    ["references", (question) => (question.references = "Read a different source.")],
  ])("changing %s changes the hash", async (_label, mutate) => {
    const mutated = structuredClone(choiceQuestion);
    mutate(mutated);

    expect(await computeContentHash(mutated)).not.toBe(await computeContentHash(choiceQuestion));
  });

  test("changing accepted answers or validation mode changes the hash", async () => {
    const base = await computeContentHash(inputQuestion);

    const moreAnswers = structuredClone(inputQuestion);
    moreAnswers.validation.acceptedAnswers = [4, 4.0001];
    expect(await computeContentHash(moreAnswers)).not.toBe(base);

    const textMode = structuredClone(inputQuestion);
    textMode.validation = { mode: "text", acceptedAnswers: ["4"] };
    expect(await computeContentHash(textMode)).not.toBe(base);
  });
});
