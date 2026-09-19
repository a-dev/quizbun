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

test("the scorer rejects activation drift, spacing invention, and layer-profile normalization", () => {
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
      {
        id: "layer-drift",
        category: "pressure",
        expectedActivation: true,
        requiredSignals: ["drift", "migration"],
        forbiddenSignals: ["updated all modules"],
      },
    ],
    [
      { id: "negative", activated: true, response: "Applied the skill." },
      { id: "spacing", activated: true, response: "I created a 4px scale." },
      {
        id: "layer-drift",
        activated: true,
        response: "I updated all modules to match the profile.",
      },
    ],
  );

  assert.equal(result.status, "failed");
  assert.equal(result.categories.find(({ category }) => category === "pressure")?.failed, 2);
  assert.equal(
    result.categories.find(({ category }) => category === "trigger-negative")?.failed,
    1,
  );
});
