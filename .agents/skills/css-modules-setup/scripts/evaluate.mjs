#!/usr/bin/env node

import path from "node:path";
import process from "node:process";
import { fileURLToPath, pathToFileURL } from "node:url";

import { readJson } from "./lib.mjs";

const SCRIPT_ROOT = path.dirname(fileURLToPath(import.meta.url));
const REPOSITORY_ROOT = path.resolve(SCRIPT_ROOT, "../../../..");

export function evaluateResponses(cases, responses) {
  const responseById = new Map(responses.map((response) => [response.id, response]));
  const results = cases.map((evaluation) => {
    const response = responseById.get(evaluation.id);
    const failures = [];
    if (!response) {
      failures.push("missing response");
    } else {
      if (response.activated !== evaluation.expectedActivation) {
        failures.push(`activation expected ${evaluation.expectedActivation}`);
      }
      const normalized = response.response.toLowerCase();
      for (const signal of evaluation.requiredSignals ?? []) {
        if (!normalized.includes(signal.toLowerCase())) failures.push(`missing signal: ${signal}`);
      }
      for (const signal of evaluation.forbiddenSignals ?? []) {
        if (normalized.includes(signal.toLowerCase())) failures.push(`forbidden signal: ${signal}`);
      }
    }
    return {
      id: evaluation.id,
      category: evaluation.category,
      passed: failures.length === 0,
      failures,
    };
  });

  const categories = Object.values(
    results.reduce((output, result) => {
      output[result.category] ??= { category: result.category, passed: 0, failed: 0 };
      output[result.category][result.passed ? "passed" : "failed"] += 1;
      return output;
    }, {}),
  ).sort((left, right) => left.category.localeCompare(right.category));

  return {
    status: results.every(({ passed }) => passed) ? "passed" : "failed",
    categories,
    results,
  };
}

export async function runEvaluation({ casesPath, responsesPath } = {}) {
  const casesFile = casesPath ?? path.join(REPOSITORY_ROOT, "evals", "css-modules.json");
  const responsesFile =
    responsesPath ?? path.join(REPOSITORY_ROOT, "evals", "fixtures", "css-modules.responses.json");
  const cases = await readJson(casesFile);
  const responses = await readJson(responsesFile);
  return evaluateResponses(cases.cases, responses.responses);
}

async function main() {
  const responsesIndex = process.argv.indexOf("--responses");
  const responsesPath =
    responsesIndex >= 0 ? path.resolve(process.argv[responsesIndex + 1]) : undefined;
  const result = await runEvaluation({ responsesPath });
  process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
  process.exitCode = result.status === "passed" ? 0 : 1;
}

if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  await main();
}
