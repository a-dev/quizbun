#!/usr/bin/env node

import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import process from "node:process";
import { fileURLToPath, pathToFileURL } from "node:url";

import { auditProject } from "./audit.mjs";
import { exists, readJson, resolveInside, validateProfile } from "./lib.mjs";

const MODES = new Set(["audit", "bootstrap", "align", "migrate", "verify"]);
const SCRIPT_ROOT = path.dirname(fileURLToPath(import.meta.url));
const SKILL_ROOT = path.dirname(SCRIPT_ROOT);
const ASSET_ROOT = path.join(SKILL_ROOT, "assets");
const TEMPLATE_ROOT = path.join(ASSET_ROOT, "templates");
const HARNESS_ROOT = path.join(SKILL_ROOT, "harness");
const SCRIPT_ROOT_FILES = ["audit.mjs", "check.mjs", "check-oxlint.mjs", "lib.mjs"];
const HARNESS_FILES = ["eslint-plugin.mjs", "oxlint-plugin.mjs", "stylelint-plugin.mjs"];
const ENFORCEMENT_DEPENDENCIES = [
  "@babel/core",
  "@babel/eslint-parser",
  "color-name",
  "eslint",
  "oxlint",
  "postcss",
  "postcss-selector-parser",
  "postcss-value-parser",
  "stylelint",
];

async function readTemplate(name) {
  return readFile(path.join(TEMPLATE_ROOT, name), "utf8");
}

async function bundledCheckerFiles() {
  const files = [
    {
      path: ".agents/css-modules-harness/versions.json",
      content: await readFile(path.join(SKILL_ROOT, "versions.json"), "utf8"),
    },
  ];
  for (const name of SCRIPT_ROOT_FILES) {
    files.push({
      path: `.agents/css-modules-harness/scripts/${name}`,
      content: await readFile(path.join(SCRIPT_ROOT, name), "utf8"),
    });
  }
  for (const name of HARNESS_FILES) {
    files.push({
      path: `.agents/css-modules-harness/harness/${name}`,
      content: await readFile(path.join(HARNESS_ROOT, name), "utf8"),
    });
  }
  return files;
}

function render(template, variables, templateName) {
  const rendered = template.replace(/\{\{([A-Z0-9_]+)\}\}/g, (placeholder, key) => {
    if (!(key in variables)) {
      throw new Error(`${templateName} requires ${key}`);
    }
    return variables[key];
  });

  const unresolved = rendered.match(/\{\{[A-Z0-9_]+\}\}/g);
  if (unresolved) {
    throw new Error(`${templateName} has unresolved placeholders: ${unresolved.join(", ")}`);
  }

  return rendered;
}

function importSpecifier(fromFile, toFile) {
  let relative = path.relative(path.dirname(fromFile), toFile).split(path.sep).join("/");
  if (!relative.startsWith(".")) {
    relative = `./${relative}`;
  }
  return relative;
}

function colorInputs(profile, inputs) {
  if (!profile.colorTokens.enabled) {
    return { required: [], files: [], imports: "", colorScheme: "" };
  }

  const required = [];
  const files = [];
  const palette = inputs.paletteFiles ?? {};
  const semantic = inputs.semanticFiles ?? {};

  for (const filePath of profile.colorTokens.paletteFiles) {
    if (typeof palette[filePath] !== "string" || palette[filePath].trim().length === 0) {
      required.push(`paletteFiles.${filePath}`);
    } else {
      files.push({ path: filePath, content: `${palette[filePath].trim()}\n` });
    }
  }
  for (const filePath of profile.colorTokens.semanticFiles) {
    if (typeof semantic[filePath] !== "string" || semantic[filePath].trim().length === 0) {
      required.push(`semanticFiles.${filePath}`);
    } else {
      files.push({ path: filePath, content: `${semantic[filePath].trim()}\n` });
    }
  }
  if (!profile.layers.order.includes(inputs.colorLayer)) {
    required.push("colorLayer");
  }

  if (required.length > 0) {
    return { required, files: [], imports: "", colorScheme: "" };
  }

  const globalPath = profile.globalStylesheet;
  const imports = [...profile.colorTokens.paletteFiles, ...profile.colorTokens.semanticFiles]
    .map(
      (filePath) =>
        `@import "${importSpecifier(globalPath, filePath)}" layer(${inputs.colorLayer});`,
    )
    .join("\n");
  const attribute = profile.colorTokens.themeAttribute;
  const explicitModes = profile.colorTokens.modes.filter((mode) => mode !== "system");
  const modeRules = explicitModes
    .map((mode) => `html[${attribute}="${mode}"] {\n  color-scheme: ${mode};\n}`)
    .join("\n\n");
  const colorScheme = `@layer ${inputs.colorLayer} {\n  html {\n    color-scheme: light dark;\n  }\n\n${modeRules
    .split("\n")
    .map((line) => (line ? `  ${line}` : line))
    .join("\n")}\n}`;

  return { required, files, imports, colorScheme };
}

async function renderBaseline(profile, inputs) {
  const requiredInputs = [];
  const files = [];
  const sharedTemplate = await readTemplate("shared.module.css.template");

  for (const module of profile.sharedApi.modules) {
    const moduleInput = inputs.sharedModules?.[module.name];
    if (
      typeof moduleInput?.className !== "string" ||
      moduleInput.className.trim().length === 0 ||
      typeof moduleInput?.declarations !== "string" ||
      moduleInput.declarations.trim().length === 0
    ) {
      requiredInputs.push(`sharedModules.${module.name}`);
      continue;
    }

    files.push({
      path: module.path,
      content: render(
        sharedTemplate,
        {
          SHARED_LAYER: module.layer,
          CLASS_NAME: moduleInput.className.trim(),
          DECLARATIONS: moduleInput.declarations.trim(),
        },
        "shared.module.css.template",
      ),
    });
  }

  const colors = colorInputs(profile, inputs);
  requiredInputs.push(...colors.required);
  if (requiredInputs.length > 0) {
    return { requiredInputs: [...new Set(requiredInputs)].sort(), files: [] };
  }

  files.push(...colors.files);
  const commonVariables = {
    CLASS_HELPER: profile.helpers.classNames,
    CSS_VARIABLE_HELPER: profile.helpers.cssVariables,
  };
  const globalTemplate = await readTemplate("global.css.template");
  files.push({
    path: profile.globalStylesheet,
    content: render(
      globalTemplate,
      {
        LAYER_ORDER: profile.layers.order.join(", "),
        COLOR_IMPORTS: colors.imports,
        COLOR_SCHEME_BLOCK: colors.colorScheme,
      },
      "global.css.template",
    ),
  });

  const cxTemplate = await readTemplate("cx.ts.template");
  const cssVariablesTemplate = await readTemplate("css-vars.ts.template");
  files.push(
    {
      path: path.join(profile.stylesRoot, "lib", "cx.ts"),
      content: render(cxTemplate, commonVariables, "cx.ts.template"),
    },
    {
      path: path.join(profile.stylesRoot, "lib", "css-vars.ts"),
      content: render(cssVariablesTemplate, commonVariables, "css-vars.ts.template"),
    },
  );

  const sharedExports = profile.sharedApi.modules
    .filter((module) => module.export)
    .map((module) => {
      const specifier = importSpecifier(profile.sharedApi.entryPoint, module.path);
      return `export { default as ${module.export} } from "${specifier}";`;
    })
    .join("\n");
  const indexTemplate = await readTemplate("index.ts.template");
  files.push({
    path: profile.sharedApi.entryPoint,
    content: render(
      indexTemplate,
      { ...commonVariables, SHARED_EXPORTS: sharedExports },
      "index.ts.template",
    ),
  });

  return { requiredInputs: [], files };
}

async function classifyDesiredFiles(root, desiredFiles, { allowReplace = false } = {}) {
  const changes = [];
  const conflicts = [];

  for (const desired of [...desiredFiles].sort((left, right) =>
    left.path.localeCompare(right.path),
  )) {
    const target = resolveInside(root, desired.path);
    if (!(await exists(target))) {
      changes.push({ action: "create", ...desired });
      continue;
    }

    const current = await readFile(target, "utf8");
    if (current !== desired.content) {
      if (allowReplace) {
        changes.push({ action: "replace", ...desired, before: current });
      } else {
        conflicts.push({
          path: desired.path,
          reason: "existing file differs; bootstrap and align never overwrite",
        });
      }
    }
  }

  return { changes, conflicts };
}

export async function planSetup({
  root = process.cwd(),
  mode,
  profileSource,
  inputsPath,
  authorizeMigrate = false,
} = {}) {
  if (!MODES.has(mode)) {
    throw new Error(`Mode must be one of: ${[...MODES].join(", ")}`);
  }
  if (mode === "migrate" && !authorizeMigrate) {
    throw new Error("migrate mode requires explicit migration authorization");
  }

  const resolvedRoot = path.resolve(root);
  const audit = await auditProject({ root: resolvedRoot });
  const base = {
    root: resolvedRoot,
    mode,
    audit,
    changes: [],
    conflicts: [],
    requiredInputs: [],
  };

  if (mode === "audit" || mode === "verify") {
    let commands = [];
    const projectProfile = path.join(resolvedRoot, ".agents", "css-modules.json");
    if (mode === "verify" && (await exists(projectProfile))) {
      const profile = await readJson(projectProfile);
      commands = ["css:generate", "css:types", "css:check", "css:verify"]
        .filter((key) => profile.commands?.[key])
        .map((key) => ({ id: key, command: profile.commands[key] }));
    }
    return { ...base, status: audit.status, commands };
  }

  let selectedProfilePath;
  if (profileSource) {
    selectedProfilePath = resolveInside(resolvedRoot, profileSource);
  } else {
    selectedProfilePath = path.join(resolvedRoot, ".agents", "css-modules.json");
  }
  if (!(await exists(selectedProfilePath))) {
    throw new Error(`${mode} requires a selected profile`);
  }

  const profile = await readJson(selectedProfilePath);
  const profileErrors = validateProfile(profile);
  if (profileErrors.length > 0) {
    throw new Error(`Selected profile is invalid: ${profileErrors.join("; ")}`);
  }

  const schema = await readFile(path.join(ASSET_ROOT, "css-modules.schema.json"), "utf8");
  const targetProfilePath = path.join(resolvedRoot, ".agents", "css-modules.json");
  const readsTargetProfile = path.resolve(selectedProfilePath) === targetProfilePath;
  const storedProfile = readsTargetProfile
    ? profile
    : { ...profile, $schema: "./css-modules.schema.json" };
  const desiredFiles = [{ path: ".agents/css-modules.schema.json", content: schema }];
  if (!readsTargetProfile || !(await exists(targetProfilePath))) {
    desiredFiles.push({
      path: ".agents/css-modules.json",
      content: `${JSON.stringify(storedProfile, null, 2)}\n`,
    });
  }

  if (mode === "bootstrap") {
    const inputs = inputsPath ? await readJson(resolveInside(resolvedRoot, inputsPath)) : {};
    const rendered = await renderBaseline(storedProfile, inputs);
    if (rendered.requiredInputs.length > 0) {
      return {
        ...base,
        status: "needs-input",
        profile: storedProfile,
        requiredInputs: rendered.requiredInputs,
      };
    }
    desiredFiles.push(...rendered.files);
  }

  if (profile.enforcement) {
    desiredFiles.push(...(await bundledCheckerFiles()));
  }

  const { changes, conflicts } = await classifyDesiredFiles(resolvedRoot, desiredFiles, {
    allowReplace: mode === "migrate",
  });
  return {
    ...base,
    status: conflicts.length > 0 ? "conflict" : changes.length > 0 ? "ready" : "aligned",
    profile: storedProfile,
    changes,
    conflicts,
    dependencies: [
      ...(mode === "bootstrap" ? ["classix", "vite-css-modules"] : []),
      ...(profile.enforcement ? ENFORCEMENT_DEPENDENCIES : []),
    ],
    commands: Object.entries(storedProfile.commands).map(([id, command]) => ({ id, command })),
  };
}

export async function applySetupPlan(plan) {
  if (!["bootstrap", "align", "migrate"].includes(plan.mode)) {
    throw new Error(`${plan.mode} mode never writes`);
  }
  if (plan.conflicts.length > 0) {
    throw new Error("Setup plan has conflicts and cannot be applied");
  }
  if (plan.requiredInputs.length > 0) {
    throw new Error("Setup plan requires developer input and cannot be applied");
  }

  const touched = [];
  try {
    for (const change of plan.changes) {
      if (!new Set(["create", "replace"]).has(change.action)) {
        throw new Error(`Unsupported mutation: ${change.action}`);
      }
      const target = resolveInside(plan.root, change.path);
      if (change.action === "create") {
        if (await exists(target)) {
          throw new Error(`Refusing to overwrite ${change.path}`);
        }
        await mkdir(path.dirname(target), { recursive: true });
        await writeFile(target, change.content, { flag: "wx" });
      } else {
        if (!(await exists(target)) || (await readFile(target, "utf8")) !== change.before) {
          throw new Error(`Refusing to replace changed file ${change.path}`);
        }
        await writeFile(target, change.content);
      }
      touched.push(change.path);
    }
  } catch (error) {
    error.touched = touched;
    throw error;
  }

  return { status: "applied", touched };
}

export function formatPlan(plan) {
  const lines = [
    `CSS Modules setup: ${plan.mode}`,
    `Target: ${plan.root}`,
    `Status: ${plan.status}`,
    "",
  ];
  for (const change of plan.changes) {
    lines.push(`${change.action.toUpperCase().padEnd(7)} ${change.path}`);
  }
  for (const conflict of plan.conflicts) {
    lines.push(`CONFLICT ${conflict.path}: ${conflict.reason}`);
  }
  for (const input of plan.requiredInputs) {
    lines.push(`INPUT   ${input}`);
  }
  if (
    plan.changes.length === 0 &&
    plan.conflicts.length === 0 &&
    plan.requiredInputs.length === 0
  ) {
    lines.push("No mutations planned.");
  }
  return lines.join("\n");
}

function parseArgs(argv) {
  const [mode, ...rest] = argv;
  const options = { mode, root: process.cwd(), format: "human", apply: false };

  for (let index = 0; index < rest.length; index += 1) {
    const argument = rest[index];
    if (argument === "--root") options.root = rest[++index];
    else if (argument === "--profile-source") options.profileSource = rest[++index];
    else if (argument === "--inputs") options.inputsPath = rest[++index];
    else if (argument === "--format") options.format = rest[++index];
    else if (argument === "--apply") options.apply = true;
    else if (argument === "--authorize-migrate") options.authorizeMigrate = true;
    else if (argument === "--help" || argument === "-h") options.help = true;
    else throw new Error(`Unknown argument: ${argument}`);
  }

  if (!["human", "json"].includes(options.format)) throw new Error("format must be human or json");
  return options;
}

function usage() {
  return [
    "Usage: node setup.mjs <audit|bootstrap|align|migrate|verify> [options]",
    "",
    "Plans are read-only by default. --apply is valid only for bootstrap, align, and migrate.",
    "--profile-source <path>  selected profile for bootstrap or migration",
    "--inputs <path>          explicit template inputs for bootstrap",
    "--authorize-migrate      confirm that migrate was explicitly requested",
    "--format <human|json>    output format",
    "--apply                  apply creates; explicit migrate may replace selected files",
  ].join("\n");
}

async function main() {
  try {
    const options = parseArgs(process.argv.slice(2));
    if (options.help || !options.mode) {
      process.stdout.write(`${usage()}\n`);
      return;
    }
    if (options.apply && ["audit", "verify"].includes(options.mode)) {
      throw new Error(`${options.mode} mode never accepts --apply`);
    }

    const plan = await planSetup(options);
    process.stdout.write(
      options.format === "json" ? `${JSON.stringify(plan, null, 2)}\n` : `${formatPlan(plan)}\n`,
    );
    if (options.apply) {
      const result = await applySetupPlan(plan);
      process.stdout.write(`Applied ${result.touched.length} file(s).\n`);
    }
    process.exitCode = ["conflict", "needs-input"].includes(plan.status) ? 2 : 0;
  } catch (error) {
    process.stderr.write(`Setup failed: ${error.message}\n`);
    if (error.touched?.length) {
      process.stderr.write(`Touched before failure: ${error.touched.join(", ")}\n`);
    }
    process.exitCode = 2;
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  await main();
}
