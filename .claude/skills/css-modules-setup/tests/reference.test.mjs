import assert from "node:assert/strict";
import { readFile, readdir } from "node:fs/promises";
import path from "node:path";
import test from "node:test";

import { verifyReferenceFixture } from "../scripts/verify-reference.mjs";

const fixtureRoot = new URL("../fixtures/vite-react/", import.meta.url);

async function snapshot(directory) {
  const root = path.resolve(directory.pathname);
  const output = [];

  async function visit(current) {
    const entries = await readdir(current, { withFileTypes: true });
    for (const entry of entries.sort((left, right) => left.name.localeCompare(right.name))) {
      const filePath = path.join(current, entry.name);
      if (entry.isDirectory()) await visit(filePath);
      else output.push([path.relative(root, filePath), await readFile(filePath, "utf8")]);
    }
  }

  await visit(root);
  return output;
}

test("reference component generates declarations, typechecks, builds, and rejects an invalid class", async () => {
  const before = await snapshot(fixtureRoot);
  const result = await verifyReferenceFixture();
  const after = await snapshot(fixtureRoot);

  assert.deepEqual(after, before);
  assert.equal(result.declarations, "passed");
  assert.equal(result.declarationMaps, "passed");
  assert.equal(result.typecheck, "passed");
  assert.equal(result.build, "passed");
  assert.equal(result.invalidClassKey, "rejected");
  assert.ok(
    result.generatedDeclarations.some((filePath) =>
      filePath.endsWith("reference-button.module.css.d.ts"),
    ),
  );
});
