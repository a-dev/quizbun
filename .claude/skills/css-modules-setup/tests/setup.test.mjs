import assert from "node:assert/strict";
import { mkdtemp, mkdir, readFile, readdir, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";

import { applySetupPlan, planSetup } from "../scripts/setup.mjs";

async function write(root, relativePath, contents) {
  const filePath = path.join(root, relativePath);
  await mkdir(path.dirname(filePath), { recursive: true });
  await writeFile(filePath, contents);
}

async function snapshot(root, relativePath = ".") {
  const directory = path.join(root, relativePath);
  const entries = await readdir(directory, { withFileTypes: true });
  const result = [];

  for (const entry of entries.sort((left, right) => left.name.localeCompare(right.name))) {
    if (entry.name === "node_modules") {
      continue;
    }
    const nextRelative = path.join(relativePath, entry.name);
    if (entry.isDirectory()) {
      result.push(...(await snapshot(root, nextRelative)));
    } else {
      result.push([nextRelative, await readFile(path.join(root, nextRelative), "utf8")]);
    }
  }

  return result;
}

function profile() {
  return {
    methodologyVersion: "1.0.0",
    profileSchemaVersion: 1,
    adapter: { name: "vite-react", version: "1.0.0" },
    appRoot: ".",
    stylesRoot: "src/foundation",
    globalStylesheet: "src/foundation/global.css",
    alias: { bare: "#foundation", subpath: "#foundation/*" },
    helpers: { classNames: "mergeClasses", cssVariables: "styleVariables" },
    sharedApi: {
      entryPoint: "src/foundation/index.ts",
      modules: [
        {
          name: "flow",
          export: "flow",
          path: "src/foundation/flow.module.css",
          layer: "primitives",
        },
      ],
      admissionRule: { strategy: "project-review" },
    },
    layers: {
      order: ["ground", "primitives", "widgets"],
      ownership: [
        { glob: "src/foundation/*.module.css", layer: "primitives" },
        { glob: "src/widgets/**/*.module.css", layer: "widgets" },
      ],
      localModules: { strategy: "unlayered" },
    },
    composition: { mode: "markup" },
    colorTokens: { enabled: false },
    commands: {
      "css:generate": "npm run css:generate",
      "css:types": "npm run css:types",
      "css:verify": "npm run css:verify",
    },
    runtimeVerification: {
      entry: "reference fixture",
      themes: [],
      viewports: ["360px", "1280px"],
      preferences: ["reduced-motion", "forced-colors"],
      directions: ["ltr"],
    },
    exceptions: [],
  };
}

async function createGreenfieldFixture() {
  const root = await mkdtemp(path.join(os.tmpdir(), "css-modules-setup-"));
  const selectedProfile = profile();

  await write(
    root,
    "package.json",
    JSON.stringify(
      {
        packageManager: "npm@11.0.0",
        scripts: { prepare: "node existing-prepare.mjs" },
        imports: {
          "#foundation": "./src/foundation/index.ts",
          "#foundation/*": "./src/foundation/*",
        },
      },
      null,
      2,
    ),
  );
  await write(root, "package-lock.json", "{}\n");
  await write(
    root,
    "tsconfig.json",
    JSON.stringify({
      compilerOptions: {
        paths: {
          "#foundation": ["./src/foundation/index.ts"],
          "#foundation/*": ["./src/foundation/*"],
        },
      },
    }),
  );
  await write(
    root,
    "vite.config.ts",
    `import react from "@vitejs/plugin-react";
import { patchCssModules } from "vite-css-modules";
export default {
  css: { modules: { localsConvention: "camelCaseOnly" } },
  plugins: [react(), patchCssModules({ generateSourceTypes: true })],
};
`,
  );
  await write(root, "src/main.tsx", 'import "#foundation/global.css";\n');
  await write(
    root,
    ".github/workflows/css.yml",
    "steps:\n  - run: npm run css:generate\n  - run: npm run css:types\n",
  );
  await write(root, "selected-profile.json", `${JSON.stringify(selectedProfile, null, 2)}\n`);
  await write(
    root,
    "setup-inputs.json",
    `${JSON.stringify(
      {
        sharedModules: {
          flow: {
            className: "cluster",
            declarations: "display: flex;\n    flex-wrap: wrap;",
          },
        },
      },
      null,
      2,
    )}\n`,
  );

  return root;
}

test("audit and verify plans leave the target byte-for-byte unchanged", async () => {
  const root = await createGreenfieldFixture();

  try {
    const before = await snapshot(root);
    const auditPlan = await planSetup({ root, mode: "audit" });
    const verifyPlan = await planSetup({ root, mode: "verify" });
    const after = await snapshot(root);

    assert.deepEqual(after, before);
    assert.deepEqual(auditPlan.changes, []);
    assert.deepEqual(verifyPlan.changes, []);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test("bootstrap plans complete profile-driven files, applies once, and is idempotent", async () => {
  const root = await createGreenfieldFixture();

  try {
    const plan = await planSetup({
      root,
      mode: "bootstrap",
      profileSource: "selected-profile.json",
      inputsPath: "setup-inputs.json",
    });

    assert.equal(plan.status, "ready");
    assert.ok(plan.changes.length > 0);
    assert.ok(plan.changes.every(({ action }) => action === "create"));
    assert.ok(plan.changes.every(({ content }) => !content.includes("{{")));

    const result = await applySetupPlan(plan);
    assert.deepEqual(
      result.touched,
      plan.changes.map(({ path: filePath }) => filePath),
    );

    const secondPlan = await planSetup({
      root,
      mode: "bootstrap",
      profileSource: "selected-profile.json",
      inputsPath: "setup-inputs.json",
    });
    assert.equal(secondPlan.status, "aligned");
    assert.deepEqual(secondPlan.changes, []);

    const moduleCss = await readFile(path.join(root, "src/foundation/flow.module.css"), "utf8");
    const entryPoint = await readFile(path.join(root, "src/foundation/index.ts"), "utf8");
    assert.match(moduleCss, /@layer primitives/);
    assert.match(moduleCss, /\.cluster/);
    assert.match(entryPoint, /mergeClasses/);
    assert.match(entryPoint, /styleVariables/);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test("bootstrap preserves existing package scripts, plugins, and production components", async () => {
  const root = await createGreenfieldFixture();

  try {
    await write(
      root,
      "src/widgets/button.tsx",
      "export function Button() { return <button />; }\n",
    );
    const packageBefore = await readFile(path.join(root, "package.json"), "utf8");
    const viteBefore = await readFile(path.join(root, "vite.config.ts"), "utf8");
    const componentBefore = await readFile(path.join(root, "src/widgets/button.tsx"), "utf8");

    const plan = await planSetup({
      root,
      mode: "bootstrap",
      profileSource: "selected-profile.json",
      inputsPath: "setup-inputs.json",
    });
    await applySetupPlan(plan);

    assert.equal(await readFile(path.join(root, "package.json"), "utf8"), packageBefore);
    assert.equal(await readFile(path.join(root, "vite.config.ts"), "utf8"), viteBefore);
    assert.equal(
      await readFile(path.join(root, "src/widgets/button.tsx"), "utf8"),
      componentBefore,
    );
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test("bootstrap stops on a different existing file instead of overwriting it", async () => {
  const root = await createGreenfieldFixture();

  try {
    await write(root, "src/foundation/flow.module.css", ".project-owned { display: grid; }\n");
    const before = await snapshot(root);
    const plan = await planSetup({
      root,
      mode: "bootstrap",
      profileSource: "selected-profile.json",
      inputsPath: "setup-inputs.json",
    });

    assert.equal(plan.status, "conflict");
    assert.deepEqual(
      plan.conflicts.map(({ path: filePath }) => filePath),
      ["src/foundation/flow.module.css"],
    );
    await assert.rejects(() => applySetupPlan(plan), /conflicts/);
    assert.deepEqual(await snapshot(root), before);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test("greenfield setup requires declarations instead of creating empty placeholder classes", async () => {
  const root = await createGreenfieldFixture();

  try {
    await write(root, "setup-inputs.json", "{}\n");
    const plan = await planSetup({
      root,
      mode: "bootstrap",
      profileSource: "selected-profile.json",
      inputsPath: "setup-inputs.json",
    });

    assert.equal(plan.status, "needs-input");
    assert.deepEqual(plan.requiredInputs, ["sharedModules.flow"]);
    assert.deepEqual(plan.changes, []);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test("align mode records an existing design without inventing baseline files", async () => {
  const root = await createGreenfieldFixture();

  try {
    await mkdir(path.join(root, ".agents"), { recursive: true });
    await write(
      root,
      ".agents/css-modules.json",
      await readFile(path.join(root, "selected-profile.json"), "utf8"),
    );
    const plan = await planSetup({ root, mode: "align" });

    assert.notEqual(plan.status, "conflict");
    assert.ok(!plan.changes.some(({ path: filePath }) => filePath.includes("palette")));
    assert.ok(!plan.changes.some(({ path: filePath }) => filePath.includes("colors")));
    assert.ok(!plan.changes.some(({ path: filePath }) => filePath.endsWith(".module.css")));
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test("alignment bundles the selected mechanical checker without overwriting project lint config", async () => {
  const root = await createGreenfieldFixture();

  try {
    const profilePath = path.join(root, "selected-profile.json");
    const selected = JSON.parse(await readFile(profilePath, "utf8"));
    selected.enforcement = {
      severity: "warning",
      privateBooleanAttributes: ["data-loading"],
    };
    selected.sharedApi.modules[0].publicClasses = ["cluster"];
    await write(root, ".agents/css-modules.json", `${JSON.stringify(selected, null, 2)}\n`);
    await write(root, "eslint.config.mjs", "export default [];\n");
    await write(root, "stylelint.config.mjs", "export default {};\n");

    const plan = await planSetup({ root, mode: "align" });

    assert.ok(plan.changes.some(({ path: filePath }) => filePath.endsWith("scripts/check.mjs")));
    assert.ok(
      plan.changes.some(({ path: filePath }) => filePath.endsWith("scripts/check-oxlint.mjs")),
    );
    assert.ok(
      plan.changes.some(({ path: filePath }) => filePath.endsWith("harness/eslint-plugin.mjs")),
    );
    assert.ok(
      plan.changes.some(({ path: filePath }) => filePath.endsWith("harness/oxlint-plugin.mjs")),
    );
    assert.ok(plan.dependencies.includes("eslint"));
    assert.ok(plan.dependencies.includes("oxlint"));
    assert.ok(plan.dependencies.includes("stylelint"));
    await applySetupPlan(plan);
    assert.equal(
      await readFile(path.join(root, "eslint.config.mjs"), "utf8"),
      "export default [];\n",
    );
    assert.equal(
      await readFile(path.join(root, "stylelint.config.mjs"), "utf8"),
      "export default {};\n",
    );
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test("migrate mode requires explicit authorization", async () => {
  const root = await createGreenfieldFixture();

  try {
    await assert.rejects(
      () => planSetup({ root, mode: "migrate", profileSource: "selected-profile.json" }),
      /explicit migration authorization/,
    );
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test("authorized migration replaces only the selected profile and preserves project choices", async () => {
  const root = await createGreenfieldFixture();

  try {
    const current = profile();
    current.methodologyVersion = "0.9.0";
    await write(root, ".agents/css-modules.json", `${JSON.stringify(current, null, 2)}\n`);

    const plan = await planSetup({
      root,
      mode: "migrate",
      profileSource: "selected-profile.json",
      authorizeMigrate: true,
    });
    assert.equal(plan.status, "ready");
    assert.deepEqual(
      plan.changes
        .filter(({ action }) => action === "replace")
        .map(({ path: filePath }) => filePath),
      [".agents/css-modules.json"],
    );

    await applySetupPlan(plan);
    const migrated = JSON.parse(
      await readFile(path.join(root, ".agents/css-modules.json"), "utf8"),
    );
    assert.equal(migrated.methodologyVersion, "1.0.0");
    assert.equal(migrated.alias.bare, "#foundation");
    assert.deepEqual(migrated.layers.order, ["ground", "primitives", "widgets"]);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test("a partial apply failure reports completed files and leaves unrelated files intact", async () => {
  const root = await createGreenfieldFixture();

  try {
    const plan = await planSetup({
      root,
      mode: "bootstrap",
      profileSource: "selected-profile.json",
      inputsPath: "setup-inputs.json",
    });
    const [first, second] = plan.changes;
    await write(root, second.path, "created after planning\n");

    await assert.rejects(async () => {
      try {
        await applySetupPlan(plan);
      } catch (error) {
        assert.deepEqual(error.touched, [first.path]);
        throw error;
      }
    }, /Refusing to overwrite/);
    assert.equal(await readFile(path.join(root, second.path), "utf8"), "created after planning\n");
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});
