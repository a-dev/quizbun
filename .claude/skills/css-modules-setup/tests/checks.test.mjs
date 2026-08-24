import assert from "node:assert/strict";
import { mkdtemp, mkdir, readFile, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";

import { checkProject, exitCodeForCheck } from "../scripts/check.mjs";

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
    appRoot: ".",
    stylesRoot: "src/styles",
    globalStylesheet: "src/styles/global.css",
    alias: { bare: "#styles", subpath: "#styles/*" },
    helpers: { classNames: "cx", cssVariables: "cssVars" },
    sharedApi: {
      entryPoint: "src/styles/index.ts",
      modules: [
        {
          name: "atoms",
          export: "atoms",
          path: "src/styles/atoms.module.css",
          layer: "atoms",
          publicClasses: ["stack"],
        },
      ],
      admissionRule: { strategy: "project-review" },
    },
    layers: {
      order: ["base", "atoms", "ui"],
      ownership: [{ glob: "src/styles/*.module.css", layer: "atoms" }],
      localModules: { strategy: "unlayered" },
    },
    composition: { mode: "composes" },
    colorTokens: {
      enabled: true,
      paletteFiles: ["src/styles/palette.css"],
      semanticFiles: ["src/styles/colors.css"],
      themeOwner: "src/theme.ts",
      themeAttribute: "data-theme",
      modes: ["system", "light", "dark"],
    },
    commands: {
      "css:generate": "npm run css:generate",
      "css:types": "npm run css:types",
      "css:check": "npm run css:check",
    },
    enforcement: {
      severity: "error",
      privateBooleanAttributes: ["data-loading"],
    },
    exceptions: [],
    ...overrides,
  };
}

async function createFixture({ invalid = false, overrides = {} } = {}) {
  const root = await mkdtemp(path.join(os.tmpdir(), "css-modules-check-"));
  await write(root, ".agents/css-modules.json", `${JSON.stringify(profile(overrides), null, 2)}\n`);
  await write(root, "src/styles/global.css", "@layer base, atoms, ui;\n");
  await write(root, "src/styles/palette.css", ":root { --palette-blue-500: #2563eb; }\n");
  await write(
    root,
    "src/styles/colors.css",
    ":root { --color-action-bg: light-dark(var(--palette-blue-500), Canvas); }\n",
  );
  await write(root, "src/theme.ts", "export const themeOwner = true;\n");
  await write(
    root,
    "src/styles/index.ts",
    invalid
      ? "// atoms appears only in a comment.\nexport {};\n"
      : 'export { default as atoms } from "./atoms.module.css";\n',
  );
  await write(
    root,
    "src/styles/atoms.module.css",
    invalid
      ? "@layer ui { .stack { display: grid; } .extraClass { color: red; } }\n"
      : "@layer atoms { .stack { display: grid; } }\n",
  );
  await write(
    root,
    "src/button.module.css",
    invalid
      ? `.root h2, .badClass[aria-pressed] {
  color: #fff !important;
  background: var(--palette-blue-500);
  border-color: var(--color-missing);
}

.root[data-loading="true"] {
  opacity: 0.5;
}

[data-theme="dark"] .root {
  color: white;
}

.label {
  composes: missing from "#styles/missing.module.css";
}
`
      : `.root[aria-pressed="false"] {
  color: var(--color-action-bg);
}

.root[data-loading] .label {
  opacity: 0.5;
}

.label {
  composes: stack from "#styles/atoms.module.css";
}

:global(.thirdPartyClass) {
  display: block;
}
`,
  );
  await write(
    root,
    "src/button.tsx",
    invalid
      ? `import styles from "./button.module.css";
import { cx } from "#styles";

type ButtonProps = { loading: boolean; size: string };

export function Button({ loading, size }: ButtonProps) {
  return (
    <button
      disabled={loading}
      data-disabled={loading}
      data-loading={loading}
      className={cx(styles[\`size-${"${size}"}\`], loading && styles.loading)}
      style={{ opacity: loading ? 0.5 : 1 }}
    />
  );
}
`
      : `import styles from "./button.module.css";
import { cx, cssVars } from "#styles";

const SIZE_CLASS = { small: styles.root, large: styles.label };

type ButtonProps = { loading: boolean; size: keyof typeof SIZE_CLASS };

export function Button({ loading, size }: ButtonProps) {
  return (
    <button
      data-loading={loading || undefined}
      className={cx(styles.root, SIZE_CLASS[size])}
      style={cssVars({ "--_progress": loading ? 1 : 0 })}
    />
  );
}
`,
  );
  return root;
}

test("reports every objective TSX, CSS, and cross-file contract rule with stable IDs", async () => {
  const root = await createFixture({ invalid: true });

  try {
    const result = await checkProject({ root });
    const ids = new Set(result.findings.map(({ ruleId }) => ruleId));

    for (const id of [
      "css-modules/no-computed-key",
      "css-modules/no-boolean-state-class",
      "css-modules/custom-property-style-only",
      "css-modules/no-duplicate-state",
      "css-modules/data-boolean-presence",
      "css-modules/class-pattern",
      "css-modules/no-palette-in-component",
      "css-modules/no-raw-color-in-component",
      "css-modules/no-local-theme-selector",
      "css-modules/layer-by-profile",
      "css-modules/no-descendant-type",
      "css-modules/no-important",
      "css-modules/state-selector-shape",
      "css-modules/semantic-token-resolves",
      "css-modules/shared-entry-export",
      "css-modules/shared-public-class",
      "css-modules/composes-path-resolves",
    ]) {
      assert.ok(ids.has(id), `missing ${id}`);
    }

    assert.ok(result.findings.every(({ message }) => /\S/.test(message)));
    assert.equal(result.status, "failed");
    assert.equal(exitCodeForCheck(result), 1);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test("accepts a compliant project without inventing spacing or extraction policy", async () => {
  const root = await createFixture();

  try {
    const result = await checkProject({ root });

    assert.deepEqual(result.findings, []);
    assert.equal(result.status, "passed");
    assert.equal(exitCodeForCheck(result), 0);
    assert.doesNotMatch(JSON.stringify(result), /spacing|second.consumer/i);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test("rejects a layer on a local module configured as unlayered", async () => {
  const root = await createFixture();

  try {
    const currentProfile = JSON.parse(
      await readFile(path.join(root, ".agents/css-modules.json"), "utf8"),
    );
    const unexpectedLayer = currentProfile.layers.order.at(-1);
    const moduleCss = await readFile(path.join(root, "src/button.module.css"), "utf8");
    await write(root, "src/button.module.css", `@layer ${unexpectedLayer} {\n${moduleCss}}\n`);

    const result = await checkProject({ root });
    const layerFinding = result.findings.find(
      ({ ruleId, file }) =>
        ruleId === "css-modules/layer-by-profile" && file === "src/button.module.css",
    );

    assert.equal(
      layerFinding?.message,
      `Expected an unlayered rule; found @layer ${unexpectedLayer}.`,
    );
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test("reports disagreement between a profiled fallback and an existing unmatched module", async () => {
  const fallbackLayer = "layer-a";
  const root = await createFixture({
    overrides: {
      layers: {
        order: ["base", "atoms", fallbackLayer],
        ownership: [{ glob: "src/styles/*.module.css", layer: "atoms" }],
        localModules: { strategy: "profiled", layer: fallbackLayer },
      },
    },
  });

  try {
    const result = await checkProject({ root });
    const layerFinding = result.findings.find(
      ({ ruleId, file }) =>
        ruleId === "css-modules/layer-by-profile" && file === "src/button.module.css",
    );

    assert.equal(
      layerFinding?.message,
      `Expected @layer ${fallbackLayer}; found an unlayered rule.`,
    );
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test("supports warning-first migration and narrow, documented rule exceptions", async () => {
  const root = await createFixture({
    invalid: true,
    overrides: {
      enforcement: { severity: "warning", privateBooleanAttributes: ["data-loading"] },
      exceptions: [
        {
          kind: "rule",
          rule: "css-modules/custom-property-style-only",
          scope: "src/button.tsx",
          match: "opacity",
          reason: "Fixture integration owns this one computed value.",
        },
      ],
    },
  });

  try {
    const result = await checkProject({ root });

    assert.ok(result.findings.length > 0);
    assert.ok(result.findings.every(({ severity }) => severity === "warning"));
    assert.ok(
      !result.findings.some(
        ({ ruleId, message }) =>
          ruleId === "css-modules/custom-property-style-only" && message.includes("opacity"),
      ),
    );
    assert.equal(result.suppressed.length, 1);
    assert.equal(result.status, "warnings");
    assert.equal(exitCodeForCheck(result), 0);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test("the checker is read-only", async () => {
  const root = await createFixture();

  try {
    const before = await readFile(path.join(root, "src/button.tsx"), "utf8");
    await checkProject({ root });
    const after = await readFile(path.join(root, "src/button.tsx"), "utf8");

    assert.equal(after, before);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test("reports ambiguous layer ownership instead of guessing the fallback layer", async () => {
  const root = await createFixture({
    overrides: {
      layers: {
        order: ["base", "atoms", "ui"],
        ownership: [
          { glob: "src/styles/*.module.css", layer: "atoms" },
          { glob: "src/**/*.module.css", layer: "ui" },
        ],
        localModules: { strategy: "unlayered" },
      },
    },
  });

  try {
    const result = await checkProject({ root });
    const ambiguous = result.findings.filter(
      ({ ruleId }) => ruleId === "css-modules/layer-ownership-ambiguous",
    );

    assert.ok(
      ambiguous.some(({ file }) => file === "src/styles/atoms.module.css"),
      "the doubly-owned shared module must be reported as ambiguous",
    );
    // The shared module declares the layer its profile entry records, so the
    // layer rule must not demand that the developer strip the wrapper.
    assert.deepEqual(
      result.findings.filter(
        ({ ruleId, file }) =>
          ruleId === "css-modules/layer-by-profile" && file === "src/styles/atoms.module.css",
      ),
      [],
    );
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test("accepts a shared export re-exported through a star specifier", async () => {
  const root = await createFixture();

  try {
    await write(
      root,
      "src/styles/exports.ts",
      'import atomsStyles from "./atoms.module.css";\nexport const atoms = atomsStyles;\n',
    );
    await write(root, "src/styles/index.ts", 'export * from "./exports";\n');

    const result = await checkProject({ root });

    assert.deepEqual(
      result.findings.filter(({ ruleId }) => ruleId === "css-modules/shared-entry-export"),
      [],
    );
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test("separates a typed literal class key from a dynamic one", async () => {
  const root = await createFixture();

  try {
    await write(
      root,
      "src/literal-key.tsx",
      'import styles from "./button.module.css";\n\nexport const literal = styles["root"];\n',
    );
    await write(
      root,
      "src/dynamic-key.tsx",
      'import styles from "./button.module.css";\n\nexport const dynamic = (key: string) => styles[key];\n',
    );

    const result = await checkProject({ root });
    const computed = result.findings.filter(
      ({ ruleId }) => ruleId === "css-modules/no-computed-key",
    );

    // styles["root"] is checked by the generated declarations exactly like
    // styles.root; only the dynamic key escapes the type system.
    assert.deepEqual(
      computed.map(({ file }) => file),
      ["src/dynamic-key.tsx"],
    );
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test("judges descendant type selectors by the compound that owns them", async () => {
  const root = await createFixture();

  try {
    await write(
      root,
      "src/qualified.module.css",
      ".root h2.title {\n  color: var(--color-action-bg);\n}\n",
    );
    await write(
      root,
      "src/nested-list.module.css",
      ".root :is(h2, h3) {\n  color: var(--color-action-bg);\n}\n",
    );

    const result = await checkProject({ root });
    const descendants = result.findings.filter(
      ({ ruleId }) => ruleId === "css-modules/no-descendant-type",
    );

    assert.ok(
      !descendants.some(({ file }) => file === "src/qualified.module.css"),
      "h2.title already owns a role class",
    );
    assert.ok(
      descendants.some(({ file }) => file === "src/nested-list.module.css"),
      "a bare type inside :is() is still a bare descendant type",
    );
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});
