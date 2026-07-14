import assert from "node:assert/strict";
import { execFile } from "node:child_process";
import { mkdtemp, mkdir, realpath, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { promisify } from "node:util";
import test from "node:test";

const execFileAsync = promisify(execFile);
const runner = new URL("../scripts/check-oxlint.mjs", import.meta.url);

async function write(root, relativePath, contents) {
  const filePath = path.join(root, relativePath);
  await mkdir(path.dirname(filePath), { recursive: true });
  await writeFile(filePath, contents);
}

function profile(overrides = {}) {
  return {
    methodologyVersion: "1.0.0",
    profileSchemaVersion: 1,
    adapter: { name: "vite-react", version: "1.0.0" },
    appRoot: "src",
    stylesRoot: "src/styles",
    globalStylesheet: "src/styles/global.css",
    alias: { bare: "#styles", subpath: "#styles/*" },
    helpers: { classNames: "mergeClasses", cssVariables: "styleVariables" },
    sharedApi: {
      entryPoint: "src/styles/index.ts",
      modules: [
        {
          name: "atoms",
          export: "atoms",
          path: "src/styles/atoms.module.css",
          layer: "components",
          publicClasses: ["root"],
        },
      ],
      admissionRule: { strategy: "project-review" },
    },
    layers: {
      order: ["base", "components"],
      ownership: [],
      localModules: { strategy: "unlayered" },
    },
    composition: { mode: "markup" },
    colorTokens: { enabled: false },
    commands: {
      "css:generate": "npm run css:generate",
      "css:types": "npm run css:types",
      "css:check": "npm run css:check",
    },
    enforcement: {
      severity: "error",
      privateBooleanAttributes: ["data-busy"],
    },
    exceptions: [],
    ...overrides,
  };
}

async function createFixture({ invalid = false, overrides = {} } = {}) {
  // realpath keeps the root canonical, so Oxlint reports cwd-relative file paths
  // (macOS os.tmpdir() is symlinked, which made Oxlint fall back to absolute paths).
  const root = await realpath(await mkdtemp(path.join(os.tmpdir(), "css-modules-oxlint-")));
  await write(root, ".agents/css-modules.json", `${JSON.stringify(profile(overrides), null, 2)}\n`);
  await write(root, "src/button.module.css", ".root {}\n.loading {}\n");
  await write(
    root,
    "src/button.tsx",
    invalid
      ? `import styles from "./button.module.css";

export function Button({ busy, size }: { busy: boolean; size: string }) {
  return (
    <button
      disabled={busy}
      data-disabled={busy}
      data-busy={busy}
      className={mergeClasses(styles[size], busy && styles.loading)}
      style={{ opacity: busy ? 0.5 : 1 }}
    />
  );
}
`
      : `import styles from "./button.module.css";

const SIZE_CLASS = { small: styles.root };

export function Button({ busy }: { busy: boolean }) {
  return (
    <button
      data-busy={busy || undefined}
      className={mergeClasses(styles.root, SIZE_CLASS.small)}
      style={styleVariables({ "--_opacity": busy ? 0.5 : 1 })}
    />
  );
}
`,
  );
  return root;
}

async function run(root, ...args) {
  try {
    const result = await execFileAsync(process.execPath, [
      runner.pathname,
      "--root",
      root,
      "--format",
      "json",
      ...args,
    ]);
    return { code: 0, ...result, json: JSON.parse(result.stdout) };
  } catch (error) {
    if (!error.stdout) {
      throw new Error(`Oxlint runner produced no JSON. stderr: ${error.stderr || error.message}`);
    }
    return {
      code: error.code,
      stdout: error.stdout,
      stderr: error.stderr,
      json: JSON.parse(error.stdout),
    };
  }
}

test("Oxlint adapter reports the CSS Modules TSX rules with stable IDs", async () => {
  const root = await createFixture({ invalid: true });

  try {
    const result = await run(root);
    const ids = new Set(result.json.findings.map(({ ruleId }) => ruleId));

    assert.equal(result.code, 1);
    assert.equal(result.json.status, "failed");
    assert.ok(result.json.findings.every(({ engine }) => engine === "oxlint"));
    for (const id of [
      "css-modules/no-computed-key",
      "css-modules/no-boolean-state-class",
      "css-modules/custom-property-style-only",
      "css-modules/no-duplicate-state",
      "css-modules/data-boolean-presence",
    ]) {
      assert.ok(ids.has(id), `missing ${id}`);
    }
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test("Oxlint adapter accepts compliant code and profile-specific helper names", async () => {
  const root = await createFixture();

  try {
    const result = await run(root);

    assert.equal(result.code, 0);
    assert.equal(result.json.status, "passed");
    assert.deepEqual(result.json.findings, []);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test("Oxlint adapter supports warning-first adoption and documented exceptions", async () => {
  const root = await createFixture({
    invalid: true,
    overrides: {
      enforcement: { severity: "warning", privateBooleanAttributes: ["data-busy"] },
      exceptions: [
        {
          kind: "rule",
          rule: "css-modules/custom-property-style-only",
          scope: "src/button.tsx",
          match: "opacity",
          reason: "Fixture integration owns this computed visual value.",
        },
      ],
    },
  });

  try {
    const result = await run(root);

    assert.equal(result.code, 0);
    assert.equal(result.json.status, "warnings");
    assert.ok(result.json.findings.every(({ severity }) => severity === "warning"));
    assert.equal(result.json.suppressed.length, 1);
    assert.equal(
      result.json.suppressed[0].finding.ruleId,
      "css-modules/custom-property-style-only",
    );
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});
