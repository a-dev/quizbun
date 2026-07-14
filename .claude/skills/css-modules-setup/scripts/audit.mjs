#!/usr/bin/env node

import { readFile } from "node:fs/promises";
import path from "node:path";
import process from "node:process";
import { pathToFileURL } from "node:url";

import {
  escapeRegExp,
  exists,
  matchesGlob,
  readJson,
  resolveInside,
  validateProfile,
  walk,
} from "./lib.mjs";

export { validateProfile };

const VITE_CONFIG_NAMES = [
  "vite.config.ts",
  "vite.config.mts",
  "vite.config.js",
  "vite.config.mjs",
  "vite.config.cjs",
  "vite.config.cts",
];

const SOURCE_EXTENSIONS = new Set([".ts", ".tsx", ".js", ".jsx", ".mts", ".mjs", ".cts", ".cjs"]);

const VERSION_CONTRACT = JSON.parse(
  await readFile(new URL("../versions.json", import.meta.url), "utf8"),
);
const SUPPORTED_METHODOLOGY_MAJOR = Number.parseInt(
  VERSION_CONTRACT.methodologyVersion.split(".")[0],
  10,
);
const SUPPORTED_PROFILE_SCHEMA = VERSION_CONTRACT.profileSchemaVersion;
const SUPPORTED_ADAPTERS = new Map(
  Object.entries(VERSION_CONTRACT.adapters).map(([name, adapter]) => [
    name,
    Number.parseInt(adapter.version.split(".")[0], 10),
  ]),
);
function finding(id, status, detail, expected, actual, verifyCommand) {
  return {
    id,
    status,
    detail,
    ...(expected === undefined ? {} : { expected }),
    ...(actual === undefined ? {} : { actual }),
    ...(verifyCommand === undefined ? {} : { verifyCommand }),
  };
}

async function readText(filePath) {
  return readFile(filePath, "utf8");
}

async function detectPackageManager(root) {
  const markers = [
    ["pnpm", "pnpm-lock.yaml"],
    ["yarn", "yarn.lock"],
    ["bun", "bun.lock"],
    ["bun", "bun.lockb"],
    ["npm", "package-lock.json"],
  ];
  const detected = [];

  for (const [manager, marker] of markers) {
    if (await exists(path.join(root, marker))) {
      detected.push({ manager, marker });
    }
  }

  const managers = [...new Set(detected.map(({ manager }) => manager))];
  if (managers.length > 1) {
    return finding(
      "project.package-manager",
      "ambiguous",
      `Multiple lockfile families found: ${detected.map(({ marker }) => marker).join(", ")}`,
    );
  }

  let packageManagerField;
  const packagePath = path.join(root, "package.json");
  if (await exists(packagePath)) {
    const packageJson = await readJson(packagePath);
    packageManagerField = packageJson.packageManager?.split("@")[0];
  }

  if (packageManagerField && managers[0] && packageManagerField !== managers[0]) {
    return finding(
      "project.package-manager",
      "ambiguous",
      "packageManager disagrees with the lockfile",
      packageManagerField,
      managers[0],
    );
  }

  const selected = packageManagerField ?? managers[0];
  return selected
    ? finding("project.package-manager", "aligned", selected, selected, selected)
    : finding(
        "project.package-manager",
        "not-verifiable",
        "No package-manager marker found",
        undefined,
        undefined,
        "node -p \"require('./package.json').packageManager\"",
      );
}

function walkSources(directory) {
  return walk(
    directory,
    (filePath) => SOURCE_EXTENSIONS.has(path.extname(filePath)) && !filePath.endsWith(".d.ts"),
  );
}

function versionMajor(version) {
  return Number.parseInt(version.split(".")[0], 10);
}

async function findViteConfigs(root) {
  return walk(root, (filePath) => VITE_CONFIG_NAMES.includes(path.basename(filePath)));
}

function normalizeLayerOrder(css) {
  const declarations = [...css.matchAll(/@layer\s+([^;{]+);/g)].map((match) =>
    match[1]
      .split(",")
      .map((name) => name.trim())
      .filter(Boolean),
  );

  return declarations;
}

function sameArray(left, right) {
  return left.length === right.length && left.every((value, index) => value === right[index]);
}

async function collectStaticConfigText(root, appRoot, viteConfigs) {
  const candidates = [
    path.join(root, "package.json"),
    path.join(root, "tsconfig.json"),
    path.join(appRoot, "package.json"),
    path.join(appRoot, "tsconfig.json"),
    ...viteConfigs,
  ];

  const texts = [];
  for (const candidate of new Set(candidates)) {
    if (await exists(candidate)) {
      texts.push(await readText(candidate));
    }
  }

  return texts.join("\n");
}

async function collectCiFiles(root) {
  const candidates = [];
  const workflowRoot = path.join(root, ".github", "workflows");

  if (await exists(workflowRoot)) {
    candidates.push(...(await walk(workflowRoot, (filePath) => /\.ya?ml$/i.test(filePath))));
  }

  for (const fileName of [".gitlab-ci.yml", "azure-pipelines.yml", "bitbucket-pipelines.yml"]) {
    const candidate = path.join(root, fileName);
    if (await exists(candidate)) {
      candidates.push(candidate);
    }
  }

  return Promise.all(
    [...new Set(candidates)].sort().map(async (filePath) => ({
      path: filePath,
      text: await readText(filePath),
    })),
  );
}

function patchCssModulesIdentifiers(source) {
  const identifiers = new Set();

  for (const match of source.matchAll(/import\s*\{([^}]*)\}\s*from\s*["']vite-css-modules["']/g)) {
    for (const specifier of match[1].split(",")) {
      const alias = specifier.trim().match(/^patchCssModules(?:\s+as\s+([\w$]+))?$/);
      if (alias) {
        identifiers.add(alias[1] ?? "patchCssModules");
      }
    }
  }

  return [...identifiers];
}

export async function auditProject({
  root = process.cwd(),
  profilePath = ".agents/css-modules.json",
} = {}) {
  const resolvedRoot = path.resolve(root);
  const findings = [await detectPackageManager(resolvedRoot)];
  const resolvedProfile = resolveInside(resolvedRoot, profilePath);

  if (!(await exists(resolvedProfile))) {
    findings.push(
      finding("profile.exists", "missing", `Profile not found: ${profilePath}`, profilePath),
    );

    const candidateConfigs = await findViteConfigs(resolvedRoot);
    if (candidateConfigs.length > 1) {
      findings.push(
        finding(
          "project.app-root",
          "ambiguous",
          `Profile is required to select one of ${candidateConfigs.length} Vite applications`,
          undefined,
          candidateConfigs.map((file) => path.relative(resolvedRoot, path.dirname(file))),
        ),
      );
    } else if (candidateConfigs.length === 1) {
      findings.push(
        finding(
          "project.app-root",
          "not-verifiable",
          `Candidate application found at ${path.relative(resolvedRoot, path.dirname(candidateConfigs[0]))}; record it in the profile`,
          undefined,
          undefined,
          "node scripts/audit.mjs --format human --profile .agents/css-modules.json",
        ),
      );
    }

    return { root: resolvedRoot, profilePath, status: summarizeStatus(findings), findings };
  }

  let profile;
  try {
    profile = await readJson(resolvedProfile);
  } catch (error) {
    findings.push(finding("profile.parse", "ambiguous", error.message));
    return { root: resolvedRoot, profilePath, status: "ambiguous", findings };
  }

  const profileErrors = validateProfile(profile);
  if (profileErrors.length > 0) {
    findings.push(finding("profile.schema", "ambiguous", profileErrors.join("; ")));
    return { root: resolvedRoot, profilePath, status: "ambiguous", findings };
  }

  findings.push(finding("profile.schema", "aligned", "Profile shape is valid"));

  const methodologyMajor = versionMajor(profile.methodologyVersion);
  findings.push(
    methodologyMajor === SUPPORTED_METHODOLOGY_MAJOR
      ? finding("profile.methodology-version", "aligned", profile.methodologyVersion)
      : finding(
          "profile.methodology-version",
          "drifted",
          "Installed audit does not support this methodology major; plan an explicit migration",
          SUPPORTED_METHODOLOGY_MAJOR,
          methodologyMajor,
        ),
  );

  findings.push(
    profile.profileSchemaVersion === SUPPORTED_PROFILE_SCHEMA
      ? finding("profile.schema-version", "aligned", profile.profileSchemaVersion)
      : finding(
          "profile.schema-version",
          "drifted",
          "Installed audit does not support this profile schema; plan an explicit migration",
          SUPPORTED_PROFILE_SCHEMA,
          profile.profileSchemaVersion,
        ),
  );

  const supportedAdapterMajor = SUPPORTED_ADAPTERS.get(profile.adapter.name);
  const adapterMajor = versionMajor(profile.adapter.version);
  if (supportedAdapterMajor === undefined) {
    findings.push(
      finding(
        "profile.adapter-version",
        "not-verifiable",
        `No executable adapter is bundled for ${profile.adapter.name}@${profile.adapter.version}`,
        undefined,
        undefined,
        profile.commands?.["css:verify"] ?? "node scripts/setup.mjs verify --format human",
      ),
    );
  } else {
    findings.push(
      adapterMajor === supportedAdapterMajor
        ? finding(
            "profile.adapter-version",
            "aligned",
            `${profile.adapter.name}@${profile.adapter.version}`,
          )
        : finding(
            "profile.adapter-version",
            "drifted",
            "Installed audit does not support this adapter major; plan an explicit migration",
            supportedAdapterMajor,
            adapterMajor,
          ),
    );
  }

  let appRoot;
  try {
    appRoot = resolveInside(resolvedRoot, profile.appRoot);
  } catch (error) {
    findings.push(finding("project.app-root", "ambiguous", error.message));
    return { root: resolvedRoot, profilePath, status: "ambiguous", findings };
  }

  findings.push(
    (await exists(appRoot))
      ? finding("project.app-root", "aligned", profile.appRoot)
      : finding("project.app-root", "missing", "Application root does not exist", profile.appRoot),
  );

  const viteConfigs = [];
  let viteText = "";
  if (profile.adapter.name === "vite-react") {
    for (const name of VITE_CONFIG_NAMES) {
      const candidate = path.join(appRoot, name);
      if (await exists(candidate)) {
        viteConfigs.push(candidate);
      }
    }

    if (viteConfigs.length === 0) {
      findings.push(finding("vite.config", "missing", "No Vite config found"));
    } else if (viteConfigs.length > 1) {
      findings.push(
        finding(
          "vite.config",
          "ambiguous",
          `Multiple Vite configs found: ${viteConfigs.map((file) => path.basename(file)).join(", ")}`,
        ),
      );
    } else {
      findings.push(finding("vite.config", "aligned", path.relative(resolvedRoot, viteConfigs[0])));
    }

    viteText = viteConfigs.length === 1 ? await readText(viteConfigs[0]) : "";
    const patchIdentifiers = patchCssModulesIdentifiers(viteText);
    const patchCallVisible = patchIdentifiers.some((identifier) =>
      new RegExp(`\\b${escapeRegExp(identifier)}\\s*\\(`).test(viteText),
    );
    findings.push(
      patchCallVisible
        ? finding("vite.patch-css-modules", "aligned", "patchCssModules is configured")
        : finding("vite.patch-css-modules", "missing", "patchCssModules is absent"),
    );
    findings.push(
      /generateSourceTypes\s*:\s*true/.test(viteText)
        ? finding("vite.source-types", "aligned", "Source type generation is enabled")
        : finding("vite.source-types", "missing", "generateSourceTypes: true is absent"),
    );

    const lightningCss = /transformer\s*:\s*["']lightningcss["']/.test(viteText);
    const camelCaseConfigured = lightningCss
      ? /cssModules[\s\S]*?(localsConvention|pattern)/.test(viteText)
      : /localsConvention\s*:\s*["']camelCaseOnly["']/.test(viteText);
    findings.push(
      camelCaseConfigured
        ? finding("vite.class-exports", "aligned", "Camel-case class export behavior is configured")
        : finding(
            "vite.class-exports",
            "missing",
            lightningCss
              ? "Lightning CSS module export behavior is not statically visible"
              : "localsConvention: camelCaseOnly is absent",
          ),
    );
  } else {
    findings.push(
      finding(
        "adapter.build-contract",
        "not-verifiable",
        `Use the ${profile.adapter.name} adapter's own executable verifier`,
        undefined,
        undefined,
        profile.commands["css:verify"] ?? profile.commands["css:types"],
      ),
    );
  }

  const requiredPaths = [
    ["styles.root", profile.stylesRoot],
    ["styles.global", profile.globalStylesheet],
    ["styles.entry-point", profile.sharedApi.entryPoint],
    ...profile.sharedApi.modules.map((module) => [`styles.module.${module.name}`, module.path]),
  ];

  if (profile.colorTokens.enabled) {
    for (const [index, file] of profile.colorTokens.paletteFiles.entries()) {
      requiredPaths.push([`colors.palette.${index}`, file]);
    }
    for (const [index, file] of profile.colorTokens.semanticFiles.entries()) {
      requiredPaths.push([`colors.semantic.${index}`, file]);
    }
    requiredPaths.push(["colors.theme-owner", profile.colorTokens.themeOwner]);
  }

  let invalidProjectPath = false;
  for (const [id, projectPath] of requiredPaths) {
    let target;
    try {
      target = resolveInside(resolvedRoot, projectPath);
    } catch (error) {
      findings.push(finding(id, "ambiguous", error.message));
      invalidProjectPath = true;
      continue;
    }

    findings.push(
      (await exists(target))
        ? finding(id, "aligned", projectPath)
        : finding(id, "missing", "Configured path does not exist", projectPath),
    );
  }

  if (invalidProjectPath) {
    return { root: resolvedRoot, profilePath, status: summarizeStatus(findings), findings };
  }

  const globalPath = resolveInside(resolvedRoot, profile.globalStylesheet);
  const globalCss = (await exists(globalPath)) ? await readText(globalPath) : "";
  const declaredOrders = normalizeLayerOrder(globalCss);
  const matchingOrder = declaredOrders.some((order) => sameArray(order, profile.layers.order));
  findings.push(
    matchingOrder
      ? finding(
          "layers.order",
          "aligned",
          "Global layer order matches the profile",
          profile.layers.order,
          profile.layers.order,
        )
      : finding(
          "layers.order",
          declaredOrders.length === 0 ? "missing" : "drifted",
          declaredOrders.length === 0
            ? "No top-level layer order found"
            : "Global layer order differs from the profile",
          profile.layers.order,
          declaredOrders,
        ),
  );

  for (const module of profile.sharedApi.modules) {
    const modulePath = resolveInside(resolvedRoot, module.path);
    if (!(await exists(modulePath))) {
      continue;
    }

    const css = await readText(modulePath);
    const layerPattern = new RegExp(`@layer\\s+${escapeRegExp(module.layer)}\\b`);
    findings.push(
      layerPattern.test(css)
        ? finding(`layers.module.${module.name}`, "aligned", `${module.path} owns ${module.layer}`)
        : finding(
            `layers.module.${module.name}`,
            "drifted",
            "Shared module does not declare its profiled layer",
            module.layer,
          ),
    );

    const matchingOwners = profile.layers.ownership.filter(({ glob }) =>
      matchesGlob(module.path, glob),
    );
    if (matchingOwners.length === 0) {
      findings.push(
        finding(
          `layers.ownership.${module.name}`,
          "missing",
          "No layer-ownership glob matches this shared module",
          module.layer,
        ),
      );
    } else if (matchingOwners.length > 1) {
      findings.push(
        finding(
          `layers.ownership.${module.name}`,
          "ambiguous",
          "More than one layer-ownership glob matches this shared module",
          undefined,
          matchingOwners,
        ),
      );
    } else {
      const [owner] = matchingOwners;
      findings.push(
        owner.layer === module.layer
          ? finding(
              `layers.ownership.${module.name}`,
              "aligned",
              `${owner.glob} owns ${module.layer}`,
            )
          : finding(
              `layers.ownership.${module.name}`,
              "drifted",
              "Ownership glob assigns a different layer",
              module.layer,
              owner.layer,
            ),
      );
    }
  }

  const entryPointPath = resolveInside(resolvedRoot, profile.sharedApi.entryPoint);
  if (await exists(entryPointPath)) {
    const entryPointSource = await readText(entryPointPath);
    for (const module of profile.sharedApi.modules) {
      if (!module.export) {
        continue;
      }

      findings.push(
        new RegExp(`\\b${escapeRegExp(module.export)}\\b`).test(entryPointSource)
          ? finding(`styles.export.${module.name}`, "aligned", module.export)
          : finding(
              `styles.export.${module.name}`,
              "missing",
              "Recorded shared export is absent from the entry point",
              module.export,
            ),
      );
    }
  }

  const staticConfigText = await collectStaticConfigText(resolvedRoot, appRoot, viteConfigs);
  for (const [id, alias] of [
    ["alias.bare", profile.alias.bare],
    ["alias.subpath", profile.alias.subpath],
  ]) {
    findings.push(
      staticConfigText.includes(alias)
        ? finding(id, "aligned", alias)
        : finding(
            id,
            "not-verifiable",
            `Alias is not statically visible: ${alias}`,
            undefined,
            undefined,
            profile.commands["css:verify"] ?? profile.commands["css:types"],
          ),
    );
  }

  const stylesRoot = resolveInside(resolvedRoot, profile.stylesRoot);
  const relativeGlobal = path.relative(stylesRoot, globalPath).split(path.sep).join("/");
  const globalSpecifier = `${profile.alias.bare}/${relativeGlobal}`;
  const sourceFiles = await walkSources(path.join(appRoot, "src"));
  let globalImportCount = 0;
  for (const sourceFile of sourceFiles) {
    const source = await readText(sourceFile);
    for (const match of source.matchAll(/\bimport\s+(?:[^"']*?\s+from\s+)?["']([^"']+)["']/g)) {
      const specifier = match[1];
      const resolvesToGlobal =
        specifier === globalSpecifier ||
        (specifier.startsWith(".") &&
          path.resolve(path.dirname(sourceFile), specifier) === globalPath);

      if (resolvesToGlobal) {
        globalImportCount += 1;
      }
    }
  }
  findings.push(
    globalImportCount === 1
      ? finding("styles.global-import", "aligned", globalSpecifier, 1, 1)
      : finding(
          "styles.global-import",
          globalImportCount === 0 ? "missing" : "drifted",
          "Global stylesheet must be imported exactly once",
          1,
          globalImportCount,
        ),
  );

  if (profile.colorTokens.enabled) {
    findings.push(
      /color-scheme\s*:/.test(globalCss)
        ? finding("colors.color-scheme", "aligned", "color-scheme mapping found")
        : finding("colors.color-scheme", "missing", "color-scheme mapping is absent"),
    );

    for (const mode of profile.colorTokens.modes.filter((mode) => mode !== "system")) {
      const modePattern = new RegExp(
        `\\[${escapeRegExp(profile.colorTokens.themeAttribute)}\\s*=\\s*["']${escapeRegExp(mode)}["']\\]`,
      );
      findings.push(
        modePattern.test(globalCss)
          ? finding(`colors.theme-mode.${mode}`, "aligned", mode)
          : finding(
              `colors.theme-mode.${mode}`,
              "missing",
              "Global stylesheet does not map this recorded theme mode",
              mode,
            ),
      );
    }

    const paletteTokens = new Set();
    for (const paletteFile of profile.colorTokens.paletteFiles) {
      const palettePath = resolveInside(resolvedRoot, paletteFile);
      if (!(await exists(palettePath))) {
        continue;
      }
      const paletteCss = await readText(palettePath);
      for (const match of paletteCss.matchAll(/(--[\w-]+)\s*:/g)) {
        paletteTokens.add(match[1]);
      }
    }

    findings.push(
      paletteTokens.size > 0
        ? finding(
            "colors.palette-definitions",
            "aligned",
            `${paletteTokens.size} palette tokens found`,
          )
        : finding("colors.palette-definitions", "missing", "No palette token definitions found"),
    );

    const semanticTexts = [];
    for (const semanticFile of profile.colorTokens.semanticFiles) {
      const semanticPath = resolveInside(resolvedRoot, semanticFile);
      if (await exists(semanticPath)) {
        semanticTexts.push(await readText(semanticPath));
      }
    }
    findings.push(
      semanticTexts.some((css) => /light-dark\s*\(/.test(css))
        ? finding("colors.semantic-mapping", "aligned", "light-dark semantic mapping found")
        : finding("colors.semantic-mapping", "missing", "No light-dark semantic mapping found"),
    );

    const moduleFiles = await walk(path.join(appRoot, "src"), (filePath) =>
      filePath.endsWith(".module.css"),
    );
    const paletteViolations = [];
    const themeSelectorViolations = [];
    const themeSelector = new RegExp(
      `\\[${escapeRegExp(profile.colorTokens.themeAttribute)}(?:\\s*=|\\])`,
    );

    for (const moduleFile of moduleFiles) {
      const css = await readText(moduleFile);
      const relativeModule = path.relative(resolvedRoot, moduleFile);
      if (
        [...paletteTokens].some((token) =>
          new RegExp(`var\\(\\s*${escapeRegExp(token)}(?:\\s*[,)]|\\s*$)`).test(css),
        )
      ) {
        paletteViolations.push(relativeModule);
      }
      if (themeSelector.test(css)) {
        themeSelectorViolations.push(relativeModule);
      }
    }

    findings.push(
      paletteViolations.length === 0
        ? finding("colors.palette-boundary", "aligned", "Component modules avoid palette tokens")
        : finding(
            "colors.palette-boundary",
            "drifted",
            "Component modules consume primitive palette tokens",
            "semantic color roles only",
            paletteViolations,
          ),
    );
    findings.push(
      themeSelectorViolations.length === 0
        ? finding(
            "colors.theme-ownership",
            "aligned",
            "Component modules do not own theme selectors",
          )
        : finding(
            "colors.theme-ownership",
            "drifted",
            "Component modules contain the application theme selector",
            profile.colorTokens.themeOwner,
            themeSelectorViolations,
          ),
    );
  }

  const commandEntries = Object.entries(profile.commands);
  findings.push(
    commandEntries.length > 0 &&
      commandEntries.every(([, command]) => typeof command === "string" && command.length > 0)
      ? finding("commands.profile", "aligned", `${commandEntries.length} commands recorded`)
      : finding("commands.profile", "missing", "No usable CSS-harness commands recorded"),
  );

  const ciFiles = await collectCiFiles(resolvedRoot);
  if (ciFiles.length === 0) {
    findings.push(
      finding("ci.configuration", "missing", "No supported CI configuration was found"),
    );
  } else {
    const generateCommand = profile.commands["css:generate"];
    const typesCommand = profile.commands["css:types"];
    const matchingFile = ciFiles.find(
      ({ text }) => text.includes(generateCommand) || text.includes(typesCommand),
    );

    if (!matchingFile) {
      findings.push(
        finding(
          "ci.css-order",
          "drifted",
          "CI exists but does not run the recorded CSS generation and type commands",
          [generateCommand, typesCommand],
          [],
        ),
      );
    } else {
      const generateIndex = matchingFile.text.indexOf(generateCommand);
      const typesIndex = matchingFile.text.indexOf(typesCommand);
      const ordered = generateIndex >= 0 && typesIndex > generateIndex;
      findings.push(
        ordered
          ? finding(
              "ci.css-order",
              "aligned",
              `${path.relative(resolvedRoot, matchingFile.path)} generates declarations before typechecking`,
            )
          : finding(
              "ci.css-order",
              "drifted",
              "CI must run the recorded CSS generation command before the CSS type command",
              [generateCommand, typesCommand],
              matchingFile.text.includes(typesCommand) &&
                matchingFile.text.includes(generateCommand)
                ? [typesCommand, generateCommand]
                : [generateCommand, typesCommand].filter((command) =>
                    matchingFile.text.includes(command),
                  ),
            ),
      );
    }
  }

  findings.push(
    finding(
      "types.freshness",
      "not-verifiable",
      `Run explicit verify mode: ${profile.commands["css:generate"]} && ${profile.commands["css:types"]}`,
      undefined,
      undefined,
      `${profile.commands["css:generate"]} && ${profile.commands["css:types"]}`,
    ),
  );

  findings.push(
    finding(
      "runtime.behavior",
      "not-verifiable",
      "Static audit does not execute Vite or a browser; run explicit verify mode",
      undefined,
      undefined,
      profile.commands["css:verify"] ?? "node scripts/setup.mjs verify --format human",
    ),
  );

  const status = summarizeStatus(findings);
  return { root: resolvedRoot, profilePath, status, findings };
}

function summarizeStatus(findings) {
  if (findings.some(({ status }) => status === "ambiguous")) {
    return "ambiguous";
  }
  if (findings.some(({ status }) => status === "drifted")) {
    return "drifted";
  }
  if (findings.some(({ status }) => status === "missing")) {
    return "missing";
  }
  if (findings.some(({ status }) => status === "not-verifiable")) {
    return "not-verifiable";
  }
  return "aligned";
}

export function exitCodeFor(result) {
  if (result.status === "ambiguous") {
    return 2;
  }
  if (["missing", "drifted"].includes(result.status)) {
    return 1;
  }
  return 0;
}

export function formatHuman(result) {
  const lines = [`CSS Modules alignment: ${result.root}`, ""];
  const width = Math.max(...result.findings.map(({ status }) => status.length));

  for (const item of result.findings) {
    lines.push(`${item.status.toUpperCase().padEnd(width)}  ${item.id.padEnd(28)}  ${item.detail}`);
    if (item.expected !== undefined) {
      lines.push(`${"".padEnd(width)}  ${"expected".padEnd(28)}  ${JSON.stringify(item.expected)}`);
    }
    if (item.actual !== undefined) {
      lines.push(`${"".padEnd(width)}  ${"actual".padEnd(28)}  ${JSON.stringify(item.actual)}`);
    }
    if (item.verifyCommand) {
      lines.push(`${"".padEnd(width)}  ${"verify".padEnd(28)}  ${item.verifyCommand}`);
    }
  }

  lines.push("", `Result: ${result.status}`);
  return lines.join("\n");
}

function parseArgs(argv) {
  const options = {
    root: process.cwd(),
    profilePath: ".agents/css-modules.json",
    format: "human",
    check: false,
  };

  for (let index = 0; index < argv.length; index += 1) {
    const argument = argv[index];
    if (argument === "--root") {
      options.root = argv[++index];
    } else if (argument === "--profile") {
      options.profilePath = argv[++index];
    } else if (argument === "--format") {
      options.format = argv[++index];
    } else if (argument === "--check") {
      options.check = true;
    } else if (argument === "--help" || argument === "-h") {
      options.help = true;
    } else {
      throw new Error(`Unknown argument: ${argument}`);
    }
  }

  if (!options.root || !options.profilePath) {
    throw new Error("--root and --profile require values");
  }
  if (!new Set(["human", "json"]).has(options.format)) {
    throw new Error("--format must be human or json");
  }

  return options;
}

function usage() {
  return [
    "Usage: node audit.mjs [options]",
    "",
    "--root <path>       project root; defaults to cwd",
    "--profile <path>    profile path relative to root",
    "--format <format>   human or json",
    "--check             CI mode; exit non-zero for missing, drifted, or ambiguous findings",
  ].join("\n");
}

async function main() {
  try {
    const options = parseArgs(process.argv.slice(2));
    if (options.help) {
      process.stdout.write(`${usage()}\n`);
      return;
    }

    const result = await auditProject(options);
    process.stdout.write(
      options.format === "json"
        ? `${JSON.stringify(result, null, 2)}\n`
        : `${formatHuman(result)}\n`,
    );
    process.exitCode = options.check ? exitCodeFor(result) : 0;
  } catch (error) {
    process.stderr.write(`Audit failed: ${error.message}\n`);
    process.exitCode = 2;
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  await main();
}
