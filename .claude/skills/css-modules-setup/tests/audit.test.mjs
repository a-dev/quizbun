import assert from "node:assert/strict";
import { mkdtemp, mkdir, readFile, readdir, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";

import { auditProject, formatHuman, validateProfile } from "../scripts/audit.mjs";

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
    const nextRelative = path.join(relativePath, entry.name);
    if (entry.isDirectory()) {
      result.push(...(await snapshot(root, nextRelative)));
    } else {
      result.push([nextRelative, await readFile(path.join(root, nextRelative), "utf8")]);
    }
  }

  return result;
}

const PACKAGE_MANAGERS = {
  npm: { field: "npm@11.0.0", lockfile: "package-lock.json" },
  pnpm: { field: "pnpm@10.0.0", lockfile: "pnpm-lock.yaml" },
  yarn: { field: "yarn@4.0.0", lockfile: "yarn.lock" },
  bun: { field: "bun@1.2.0", lockfile: "bun.lock" },
};

async function createFixture({
  ci = "aligned",
  configName = "vite.config.ts",
  configShape = "object",
  layerOrder = ["foundation", "components"],
  packageManager = "npm",
} = {}) {
  const root = await mkdtemp(path.join(os.tmpdir(), "css-modules-audit-"));
  const manager = PACKAGE_MANAGERS[packageManager];

  await write(
    root,
    "package.json",
    JSON.stringify(
      {
        packageManager: manager.field,
        imports: {
          "#shared": "./src/styles/index.ts",
          "#shared/*": "./src/styles/*",
        },
      },
      null,
      2,
    ),
  );
  await write(root, manager.lockfile, "# fixture lockfile\n");
  await write(
    root,
    "tsconfig.json",
    JSON.stringify({
      compilerOptions: {
        paths: { "#shared": ["./src/styles/index.ts"], "#shared/*": ["./src/styles/*"] },
      },
    }),
  );
  await write(
    root,
    configName,
    configShape === "function"
      ? `
import { patchCssModules as typedCssModules } from "vite-css-modules";
export default () => ({
  css: { modules: { localsConvention: "camelCaseOnly" } },
  plugins: [typedCssModules({ generateSourceTypes: true })],
});
`
      : `
import { patchCssModules } from "vite-css-modules";
export default {
  css: { modules: { localsConvention: "camelCaseOnly" } },
  plugins: [patchCssModules({ generateSourceTypes: true })],
};
`,
  );
  await write(root, "src/styles/global.css", `@layer ${layerOrder.join(", ")};\n`);
  await write(
    root,
    "src/styles/atoms.module.css",
    "@layer foundation { .cluster { display: flex; } }\n",
  );
  await write(
    root,
    "src/styles/index.ts",
    'export { default as atoms } from "./atoms.module.css";\n',
  );
  await write(root, "src/main.tsx", 'import "#shared/global.css";\n');
  if (ci !== "missing") {
    const steps =
      ci === "aligned"
        ? "npm run css:generate\n          npm run css:types"
        : "npm run css:types\n          npm run css:generate";
    await write(
      root,
      ".github/workflows/css.yml",
      `name: css\nsteps:\n  - run: |\n          ${steps}\n`,
    );
  }
  await write(
    root,
    ".agents/css-modules.json",
    JSON.stringify(
      {
        methodologyVersion: "1.0.0",
        profileSchemaVersion: 1,
        adapter: { name: "vite-react", version: "1.0.0" },
        appRoot: ".",
        stylesRoot: "src/styles",
        globalStylesheet: "src/styles/global.css",
        alias: { bare: "#shared", subpath: "#shared/*" },
        helpers: { classNames: "classes", cssVariables: "variables" },
        sharedApi: {
          entryPoint: "src/styles/index.ts",
          modules: [
            {
              name: "atoms",
              export: "atoms",
              path: "src/styles/atoms.module.css",
              layer: "foundation",
            },
          ],
          admissionRule: { strategy: "project-review" },
        },
        layers: {
          order: ["foundation", "components"],
          ownership: [{ glob: "src/styles/*.module.css", layer: "foundation" }],
          localModules: { strategy: "unlayered" },
        },
        composition: { mode: "markup" },
        colorTokens: { enabled: false },
        commands: {
          "css:generate": `${packageManager} run css:generate`,
          "css:types": `${packageManager} run css:types`,
        },
        exceptions: [],
      },
      null,
      2,
    ),
  );

  return root;
}

async function updateProfile(root, update) {
  const profilePath = path.join(root, ".agents/css-modules.json");
  const profile = JSON.parse(await readFile(profilePath, "utf8"));
  update(profile);
  await writeFile(profilePath, JSON.stringify(profile, null, 2));
}

test("accepts a differently named coherent topology and does not write", async () => {
  const root = await createFixture();

  try {
    const before = await snapshot(root);
    const result = await auditProject({ root });
    const after = await snapshot(root);

    assert.deepEqual(after, before);
    assert.equal(result.findings.find(({ id }) => id === "layers.order")?.status, "aligned");
    assert.equal(result.findings.find(({ id }) => id === "layers.module.atoms")?.status, "aligned");
    assert.ok(
      !result.findings.some(({ status }) => ["missing", "drifted", "ambiguous"].includes(status)),
    );
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test("accepts the article reference layer topology", async () => {
  const root = await createFixture();

  try {
    await updateProfile(root, (selectedProfile) => {
      selectedProfile.layers.order = ["reset", "base", "atoms", "ui"];
      selectedProfile.layers.ownership[0].layer = "atoms";
      selectedProfile.sharedApi.modules[0].layer = "atoms";
    });
    await write(root, "src/styles/global.css", "@layer reset, base, atoms, ui;\n");
    await write(
      root,
      "src/styles/atoms.module.css",
      "@layer atoms { .cluster { display: flex; } }\n",
    );

    const result = await auditProject({ root });
    assert.equal(result.findings.find(({ id }) => id === "layers.order")?.status, "aligned");
    assert.equal(result.findings.find(({ id }) => id === "layers.module.atoms")?.status, "aligned");
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test("reports profile drift when executable layer order changes", async () => {
  const root = await createFixture({ layerOrder: ["components", "foundation"] });

  try {
    const result = await auditProject({ root });
    const layerFinding = result.findings.find(({ id }) => id === "layers.order");

    assert.equal(layerFinding?.status, "drifted");
    assert.deepEqual(layerFinding?.expected, ["foundation", "components"]);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test("rejects generic spacing and size-scale policy fields", async () => {
  const root = await createFixture();

  try {
    const profilePath = path.join(root, ".agents/css-modules.json");
    const profile = JSON.parse(await readFile(profilePath, "utf8"));
    profile.spacing = { policy: "rhythm", unitPx: 4 };
    await writeFile(profilePath, JSON.stringify(profile));

    const result = await auditProject({ root });
    assert.equal(result.status, "ambiguous");
    assert.match(
      result.findings.find(({ id }) => id === "profile.schema")?.detail ?? "",
      /must not define spacing/,
    );
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

for (const packageManager of Object.keys(PACKAGE_MANAGERS)) {
  test(`detects ${packageManager} without creating another lockfile`, async () => {
    const root = await createFixture({ packageManager });

    try {
      const before = await snapshot(root);
      const result = await auditProject({ root });
      const after = await snapshot(root);

      assert.deepEqual(after, before);
      assert.equal(
        result.findings.find(({ id }) => id === "project.package-manager")?.actual,
        packageManager,
      );
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  });
}

test("requires a profile to choose between multiple Vite applications", async () => {
  const root = await mkdtemp(path.join(os.tmpdir(), "css-modules-audit-monorepo-"));

  try {
    await write(root, "package.json", JSON.stringify({ packageManager: "pnpm@10.0.0" }));
    await write(root, "pnpm-lock.yaml", "# fixture lockfile\n");
    await write(root, "apps/store/vite.config.ts", "export default {};\n");
    await write(root, "apps/admin/vite.config.ts", "export default {};\n");

    const result = await auditProject({ root });

    assert.equal(result.status, "ambiguous");
    assert.equal(result.findings.find(({ id }) => id === "project.app-root")?.status, "ambiguous");
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test("reports methodology-major drift without rewriting the profile", async () => {
  const root = await createFixture();

  try {
    await updateProfile(root, (profile) => {
      profile.methodologyVersion = "2.0.0";
    });
    const before = await snapshot(root);
    const result = await auditProject({ root });
    const after = await snapshot(root);

    assert.deepEqual(after, before);
    assert.equal(
      result.findings.find(({ id }) => id === "profile.methodology-version")?.status,
      "drifted",
    );
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test("reports profile-schema drift without rewriting the profile", async () => {
  const root = await createFixture();

  try {
    await updateProfile(root, (profile) => {
      profile.profileSchemaVersion = 2;
    });
    const before = await snapshot(root);
    const result = await auditProject({ root });
    const after = await snapshot(root);

    assert.deepEqual(after, before);
    assert.equal(
      result.findings.find(({ id }) => id === "profile.schema-version")?.status,
      "drifted",
    );
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test("reports ownership drift separately from the layer declared in CSS", async () => {
  const root = await createFixture();

  try {
    await updateProfile(root, (profile) => {
      profile.layers.ownership[0].layer = "components";
    });
    const result = await auditProject({ root });

    assert.equal(result.findings.find(({ id }) => id === "layers.module.atoms")?.status, "aligned");
    assert.equal(
      result.findings.find(({ id }) => id === "layers.ownership.atoms")?.status,
      "drifted",
    );
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test("accepts one relative import of the global stylesheet", async () => {
  const root = await createFixture();

  try {
    await write(root, "src/main.tsx", 'import "./styles/global.css";\n');
    const result = await auditProject({ root });

    assert.equal(
      result.findings.find(({ id }) => id === "styles.global-import")?.status,
      "aligned",
    );
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test("reports palette-token use inside a component module", async () => {
  const root = await createFixture();

  try {
    await updateProfile(root, (profile) => {
      profile.colorTokens = {
        enabled: true,
        paletteFiles: ["src/styles/palette.css"],
        semanticFiles: ["src/styles/colors.css"],
        themeOwner: "src/theme.ts",
        themeAttribute: "data-theme",
        modes: ["system", "light", "dark"],
      };
    });
    await write(root, "src/styles/palette.css", ":root { --color-blue-500: blue; }\n");
    await write(
      root,
      "src/styles/colors.css",
      ":root { --color-action-bg: light-dark(var(--color-blue-500), var(--color-blue-500)); }\n",
    );
    await write(root, "src/theme.ts", "export const themeOwner = true;\n");
    await write(
      root,
      "src/styles/global.css",
      '@layer foundation, components;\nhtml { color-scheme: light dark; }\nhtml[data-theme="light"] { color-scheme: light; }\nhtml[data-theme="dark"] { color-scheme: dark; }\n',
    );
    await write(root, "src/card.module.css", ".root { color: var(--color-blue-500); }\n");

    const result = await auditProject({ root });

    assert.equal(
      result.findings.find(({ id }) => id === "colors.palette-boundary")?.status,
      "drifted",
    );
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test("the bundled example satisfies the executable profile validator", async () => {
  const example = JSON.parse(
    await readFile(new URL("../assets/css-modules.example.json", import.meta.url), "utf8"),
  );

  assert.deepEqual(validateProfile(example), []);
});

test("accepts a profiled fallback that shares a layer with scoped ownership", async () => {
  const example = JSON.parse(
    await readFile(new URL("../assets/css-modules.example.json", import.meta.url), "utf8"),
  );
  const scopedLayer = example.layers.ownership.at(-1).layer;
  example.layers.localModules = { strategy: "profiled", layer: scopedLayer };

  assert.deepEqual(validateProfile(example), []);
});

test("rejects a profiled fallback absent from the layer order", async () => {
  const example = JSON.parse(
    await readFile(new URL("../assets/css-modules.example.json", import.meta.url), "utf8"),
  );
  example.layers.localModules = { strategy: "profiled", layer: "layer-not-in-order" };

  assert.match(validateProfile(example).join("; "), /localModules\.layer is absent/);
});

test("rejects a rule exception without the required scope, reason, or rule id", async () => {
  const example = JSON.parse(
    await readFile(new URL("../assets/css-modules.example.json", import.meta.url), "utf8"),
  );
  example.exceptions = [{ kind: "rule", rule: "css-modules/no-important" }];

  const errors = validateProfile(example).join("; ");
  assert.match(errors, /exceptions\[0\]\.scope/);
  assert.match(errors, /exceptions\[0\]\.reason/);
});

test("rejects generic application commands in the CSS profile", async () => {
  const example = JSON.parse(
    await readFile(new URL("../assets/css-modules.example.json", import.meta.url), "utf8"),
  );
  example.commands.test = "npm test";

  assert.match(validateProfile(example).join("; "), /not a CSS harness command/);
});

test("template choices remain profile-driven", async () => {
  const globalTemplate = await readFile(
    new URL("../assets/templates/global.css.template", import.meta.url),
    "utf8",
  );
  const buttonTemplate = await readFile(
    new URL("../assets/templates/reference-button.module.css.template", import.meta.url),
    "utf8",
  );

  assert.match(globalTemplate, /\{\{COLOR_SCHEME_BLOCK\}\}/);
  assert.doesNotMatch(globalTemplate, /data-theme/);
  assert.match(buttonTemplate, /\{\{REFERENCE_BUTTON_COLOR_RULES\}\}/);
  assert.match(buttonTemplate, /var\(--_progress\)/);
  assert.match(buttonTemplate, /prefers-reduced-motion/);
  assert.match(buttonTemplate, /forced-colors/);
});

test("reports profile paths that escape the project root", async () => {
  const root = await createFixture();

  try {
    await updateProfile(root, (profile) => {
      profile.globalStylesheet = "../outside.css";
    });
    const result = await auditProject({ root });

    assert.equal(result.status, "ambiguous");
    assert.match(
      result.findings.find(({ id }) => id === "styles.global")?.detail ?? "",
      /escapes the project root/,
    );
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test("returns deterministic findings for unchanged input", async () => {
  const root = await createFixture();

  try {
    assert.deepEqual(await auditProject({ root }), await auditProject({ root }));
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test("human output contains every JSON finding id and status", async () => {
  const root = await createFixture();

  try {
    const result = await auditProject({ root });
    const human = formatHuman(result);

    for (const finding of result.findings) {
      assert.match(human, new RegExp(finding.id.replaceAll(".", "\\.")));
      assert.match(human, new RegExp(finding.status.toUpperCase()));
    }
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test("every not-verifiable finding provides an exact follow-up command", async () => {
  const root = await createFixture();

  try {
    const result = await auditProject({ root });
    const unverifiable = result.findings.filter(({ status }) => status === "not-verifiable");

    assert.ok(unverifiable.length > 0);
    for (const finding of unverifiable) {
      assert.equal(typeof finding.verifyCommand, "string", finding.id);
      assert.ok(finding.verifyCommand.length > 0, finding.id);
    }
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

for (const configName of [
  "vite.config.ts",
  "vite.config.mts",
  "vite.config.js",
  "vite.config.mjs",
  "vite.config.cjs",
  "vite.config.cts",
]) {
  test(`audits ${configName}`, async () => {
    const root = await createFixture({ configName });

    try {
      const result = await auditProject({ root });
      assert.equal(result.findings.find(({ id }) => id === "vite.config")?.status, "aligned");
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  });
}

test("accepts an aliased patch plugin in a function-form Vite config", async () => {
  const root = await createFixture({ configShape: "function" });

  try {
    const result = await auditProject({ root });
    assert.equal(
      result.findings.find(({ id }) => id === "vite.patch-css-modules")?.status,
      "aligned",
    );
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test("distinguishes missing CI from a broken CSS command order", async () => {
  const missingRoot = await createFixture({ ci: "missing" });
  const brokenRoot = await createFixture({ ci: "broken" });

  try {
    const missing = await auditProject({ root: missingRoot });
    const broken = await auditProject({ root: brokenRoot });

    assert.equal(missing.findings.find(({ id }) => id === "ci.configuration")?.status, "missing");
    assert.equal(broken.findings.find(({ id }) => id === "ci.css-order")?.status, "drifted");
  } finally {
    await rm(missingRoot, { recursive: true, force: true });
    await rm(brokenRoot, { recursive: true, force: true });
  }
});
