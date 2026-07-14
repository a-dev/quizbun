import assert from "node:assert/strict";
import test from "node:test";

import { evaluateResponses, runEvaluation } from "../scripts/evaluate.mjs";

test("trigger and pressure evaluations pass by category", async () => {
  const result = await runEvaluation();

  assert.equal(result.status, "passed");
  assert.deepEqual(
    result.categories.map(({ category, failed }) => [category, failed]),
    [
      ["pressure", 0],
      ["trigger-negative", 0],
      ["trigger-positive", 0],
    ],
  );
});

test("the scorer rejects activation drift and spacing invention", () => {
  const result = evaluateResponses(
    [
      {
        id: "negative",
        category: "trigger-negative",
        expectedActivation: false,
      },
      {
        id: "spacing",
        category: "pressure",
        expectedActivation: true,
        requiredSignals: ["project decision"],
        forbiddenSignals: ["created a 4px scale"],
      },
    ],
    [
      { id: "negative", activated: true, response: "Applied the skill." },
      { id: "spacing", activated: true, response: "I created a 4px scale." },
    ],
  );

  assert.equal(result.status, "failed");
  assert.equal(result.categories.find(({ category }) => category === "pressure")?.failed, 1);
  assert.equal(
    result.categories.find(({ category }) => category === "trigger-negative")?.failed,
    1,
  );
});
