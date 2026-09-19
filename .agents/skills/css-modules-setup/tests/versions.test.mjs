import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

async function json(relativeUrl) {
  return JSON.parse(await readFile(new URL(relativeUrl, import.meta.url), "utf8"));
}

function numeric(version) {
  return version.split(".").map((part) => Number.parseInt(part, 10));
}

function atLeast(actual, minimum) {
  const left = numeric(actual);
  const right = numeric(minimum);
  for (let index = 0; index < Math.max(left.length, right.length); index += 1) {
    if ((left[index] ?? 0) !== (right[index] ?? 0)) return (left[index] ?? 0) > (right[index] ?? 0);
  }
  return true;
}

test("package, methodology, schema, adapter, and minimum versions share one contract", async () => {
  const versions = await json("../versions.json");
  const profile = await json("../assets/css-modules.example.json");
  const packageJson = await json("../../../../package.json");

  assert.equal(versions.skillPackageVersion, packageJson.version);
  assert.equal(versions.methodologyVersion, profile.methodologyVersion);
  assert.equal(versions.profileSchemaVersion, profile.profileSchemaVersion);
  assert.equal(versions.adapters[profile.adapter.name].version, profile.adapter.version);
  assert.equal(packageJson.devDependencies.oxlint, versions.enforcement.oxlint);

  for (const [dependency, minimum] of Object.entries(
    versions.adapters[profile.adapter.name].minimums,
  )) {
    assert.ok(packageJson.devDependencies[dependency], `missing pinned ${dependency}`);
    assert.ok(
      atLeast(packageJson.devDependencies[dependency], minimum),
      `${dependency} is below ${minimum}`,
    );
  }
});

test("the published schema requires every conditional field the validator enforces", async () => {
  const schema = await json("../assets/css-modules.schema.json");
  const conditionals = schema.allOf ?? [];

  // validateProfile rejects enforcement without publicClasses. The schema ships
  // beside the profile so an editor catches that before a script does, so the
  // two must agree on it.
  const enforcementRule = conditionals.find((entry) => entry.if?.required?.includes("enforcement"));
  assert.ok(enforcementRule, "schema must condition on the enforcement field");
  assert.deepEqual(enforcementRule.then.properties.sharedApi.properties.modules.items.required, [
    "name",
    "path",
    "layer",
    "publicClasses",
  ]);

  const modules = schema.properties.sharedApi.properties.modules.items;
  assert.ok(
    !modules.required.includes("publicClasses"),
    "publicClasses stays optional without enforcement",
  );
});
