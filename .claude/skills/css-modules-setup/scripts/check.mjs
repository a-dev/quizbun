#!/usr/bin/env node

import babelParser from "@babel/eslint-parser";
import { spawn } from "node:child_process";
import { ESLint } from "eslint";
import { readFile } from "node:fs/promises";
import path from "node:path";
import process from "node:process";
import { pathToFileURL } from "node:url";
import postcss from "postcss";
import selectorParser from "postcss-selector-parser";
import valueParser from "postcss-value-parser";
import stylelint from "stylelint";

import eslintPlugin, { eslintRuleIds } from "../harness/eslint-plugin.mjs";
import stylelintPlugins, { stylelintRuleIds } from "../harness/stylelint-plugin.mjs";
import {
  escapeRegExp,
  exists,
  exitCodeForFindings,
  finalizeFindings,
  formatFindingsReport,
  matchesGlob,
  readProfile,
  resolveInside,
  selectSeverity,
  walk,
} from "./lib.mjs";

const SOURCE_EXTENSIONS = new Set([".js", ".jsx", ".ts", ".tsx", ".mjs", ".mts", ".cjs", ".cts"]);

function finding({ engine, ruleId, file, line = 1, column = 1, message, severity }) {
  return { engine, ruleId, file, line, column, message, severity };
}

async function paletteTokens(root, profile) {
  const tokens = new Set();
  if (!profile.colorTokens.enabled) return tokens;
  for (const file of profile.colorTokens.paletteFiles) {
    const target = resolveInside(root, file);
    if (!(await exists(target))) continue;
    const css = postcss.parse(await readFile(target, "utf8"), { from: target });
    css.walkDecls((declaration) => {
      if (declaration.prop.startsWith("--")) tokens.add(declaration.prop);
    });
  }
  return tokens;
}

function expectedLayer(profile, relativeFile) {
  const owners = profile.layers.ownership.filter(({ glob }) => matchesGlob(relativeFile, glob));
  if (owners.length === 1) return owners[0].layer;
  if (relativeFile.endsWith(".module.css") && profile.layers.localModules.strategy === "profiled") {
    return profile.layers.localModules.layer;
  }
  return null;
}

async function runEslint(root, profile, severity) {
  const sourceFiles = await walk(
    resolveInside(root, profile.appRoot),
    (file) => SOURCE_EXTENSIONS.has(path.extname(file)) && !file.endsWith(".d.ts"),
  );
  if (sourceFiles.length === 0) return [];
  const ruleSeverity = severity === "error" ? 2 : 1;
  const eslint = new ESLint({
    cwd: root,
    overrideConfigFile: true,
    overrideConfig: [
      {
        files: ["**/*.{js,jsx,ts,tsx,mjs,mts,cjs,cts}"],
        languageOptions: {
          parser: babelParser,
          parserOptions: {
            requireConfigFile: false,
            babelOptions: { parserOpts: { plugins: ["jsx", "typescript"] } },
          },
        },
        plugins: { "css-modules": eslintPlugin },
        rules: Object.fromEntries(eslintRuleIds.map((id) => [`css-modules/${id}`, ruleSeverity])),
        settings: {
          cssModules: {
            classNamesHelper: profile.helpers.classNames,
            cssVariablesHelper: profile.helpers.cssVariables,
            privateBooleanAttributes: profile.enforcement?.privateBooleanAttributes ?? [
              "data-loading",
            ],
          },
        },
      },
    ],
  });
  const results = await eslint.lintFiles(sourceFiles);
  return results.flatMap((result) =>
    result.messages.map((message) =>
      finding({
        engine: "eslint",
        ruleId: message.ruleId ?? "eslint/parse-error",
        file: path.relative(root, result.filePath).split(path.sep).join("/"),
        line: message.line,
        column: message.column,
        message: message.message,
        severity: message.severity === 2 ? "error" : "warning",
      }),
    ),
  );
}

async function runStylelint(root, profile, severity, palette) {
  const cssFiles = await walk(resolveInside(root, profile.appRoot), (file) =>
    file.endsWith(".module.css"),
  );
  const findings = [];
  for (const file of cssFiles) {
    const relativeFile = path.relative(root, file).split(path.sep).join("/");
    const options = {
      severity,
      paletteTokens: [...palette],
      colorContractEnabled: profile.colorTokens.enabled,
      themeAttribute: profile.colorTokens.enabled ? profile.colorTokens.themeAttribute : null,
      themeOwner: profile.colorTokens.enabled ? profile.colorTokens.themeOwner : null,
      expectedLayer: expectedLayer(profile, relativeFile),
      privateBooleanAttributes: profile.enforcement?.privateBooleanAttributes ?? ["data-loading"],
    };
    const result = await stylelint.lint({
      code: await readFile(file, "utf8"),
      codeFilename: file,
      config: {
        plugins: stylelintPlugins,
        rules: Object.fromEntries(stylelintRuleIds.map((id) => [id, [true, options]])),
      },
    });
    for (const warning of result.results[0]?.warnings ?? []) {
      findings.push(
        finding({
          engine: "stylelint",
          ruleId: warning.rule,
          file: relativeFile,
          line: warning.line,
          column: warning.column,
          message: warning.text.replace(new RegExp(`\\s+\\(${escapeRegExp(warning.rule)}\\)$`), ""),
          severity: warning.severity,
        }),
      );
    }
  }
  return findings;
}

function sourcePosition(node) {
  return { line: node?.source?.start?.line ?? 1, column: node?.source?.start?.column ?? 1 };
}

async function semanticDefinitions(root, profile) {
  const definitions = new Set();
  if (!profile.colorTokens.enabled) return definitions;
  for (const file of profile.colorTokens.semanticFiles) {
    const target = resolveInside(root, file);
    if (!(await exists(target))) continue;
    const css = postcss.parse(await readFile(target, "utf8"), { from: target });
    css.walkDecls((declaration) => {
      if (declaration.prop.startsWith("--")) definitions.add(declaration.prop);
    });
  }
  return definitions;
}

function classDefinitions(css) {
  const classes = new Set();
  css.walkRules((rule) => {
    try {
      selectorParser((selectors) =>
        selectors.walkClasses((node) => classes.add(node.value)),
      ).processSync(rule.selector);
    } catch {
      // Stylelint reports malformed selectors.
    }
  });
  return classes;
}

function resolveComposesSpecifier(profile, specifier) {
  if (specifier === profile.alias.bare) return profile.sharedApi.entryPoint;
  const prefix = `${profile.alias.bare}/`;
  return specifier.startsWith(prefix)
    ? path.join(profile.stylesRoot, specifier.slice(prefix.length))
    : null;
}

function exportedNames(source, filePath) {
  const parsed = babelParser.parseForESLint(source, {
    filePath,
    requireConfigFile: false,
    babelOptions: { parserOpts: { plugins: ["typescript"] } },
  });
  const names = new Set();
  for (const statement of parsed.ast.body) {
    if (statement.type !== "ExportNamedDeclaration") continue;
    for (const specifier of statement.specifiers) {
      if (specifier.exported?.type === "Identifier") names.add(specifier.exported.name);
      else if (typeof specifier.exported?.value === "string") names.add(specifier.exported.value);
    }
    const declaration = statement.declaration;
    if (declaration?.type === "VariableDeclaration") {
      for (const item of declaration.declarations) {
        if (item.id.type === "Identifier") names.add(item.id.name);
      }
    } else if (declaration?.id?.type === "Identifier") {
      names.add(declaration.id.name);
    }
  }
  return names;
}

async function runContracts(root, profile, severity) {
  const findings = [];
  const add = (ruleId, file, node, message) =>
    findings.push(
      finding({
        engine: "contract",
        ruleId,
        file,
        ...sourcePosition(node),
        message,
        severity,
      }),
    );
  const semanticTokens = await semanticDefinitions(root, profile);
  const colorProperty =
    /^(?:color|background-color|border(?:-(?:block|inline))?(?:-(?:start|end))?-color|outline-color|text-decoration-color|caret-color|accent-color|fill|stroke)$/;
  const componentModules = await walk(resolveInside(root, profile.appRoot), (file) =>
    file.endsWith(".module.css"),
  );
  const modulePaths = new Set(componentModules.map((file) => path.resolve(file)));

  for (const file of componentModules) {
    const relativeFile = path.relative(root, file).split(path.sep).join("/");
    const css = postcss.parse(await readFile(file, "utf8"), { from: file });
    if (profile.colorTokens.enabled && !profile.colorTokens.semanticFiles.includes(relativeFile)) {
      css.walkDecls((declaration) => {
        valueParser(declaration.value).walk((node) => {
          if (
            node.type === "word" &&
            node.value.startsWith("--") &&
            !node.value.startsWith("--_") &&
            (node.value.startsWith("--color-") || colorProperty.test(declaration.prop)) &&
            !semanticTokens.has(node.value)
          ) {
            add(
              "css-modules/semantic-token-resolves",
              relativeFile,
              declaration,
              `Semantic color token ${node.value} is not defined by the recorded color contract.`,
            );
          }
        });
      });
    }
    css.walkDecls("composes", (declaration) => {
      const match = declaration.value.match(/\sfrom\s+["']([^"']+)["']\s*$/);
      if (!match) return;
      const target = resolveComposesSpecifier(profile, match[1]);
      if (!target || !modulePaths.has(resolveInside(root, target))) {
        add(
          "css-modules/composes-path-resolves",
          relativeFile,
          declaration,
          `External composes path ${match[1]} does not resolve through the recorded style alias.`,
        );
      }
    });
  }

  const entryPath = resolveInside(root, profile.sharedApi.entryPoint);
  const entrySource = (await exists(entryPath)) ? await readFile(entryPath, "utf8") : "";
  const entryExports = entrySource ? exportedNames(entrySource, entryPath) : new Set();
  for (const module of profile.sharedApi.modules) {
    if (module.export && !entryExports.has(module.export)) {
      add(
        "css-modules/shared-entry-export",
        profile.sharedApi.entryPoint,
        null,
        `Shared entry point must export ${module.export} for ${module.name}.`,
      );
    }
    if (!module.publicClasses) continue;
    const modulePath = resolveInside(root, module.path);
    if (!(await exists(modulePath))) continue;
    const css = postcss.parse(await readFile(modulePath, "utf8"), { from: modulePath });
    const actualClasses = classDefinitions(css);
    for (const className of actualClasses) {
      if (!module.publicClasses.includes(className)) {
        add(
          "css-modules/shared-public-class",
          module.path,
          css,
          `Shared class .${className} is not listed in sharedApi.modules.${module.name}.publicClasses.`,
        );
      }
    }
    for (const className of module.publicClasses) {
      if (!actualClasses.has(className)) {
        add(
          "css-modules/shared-public-class",
          module.path,
          css,
          `Recorded public class .${className} is absent from ${module.path}.`,
        );
      }
    }
  }
  return findings;
}

export async function checkProject({
  root = process.cwd(),
  profilePath = ".agents/css-modules.json",
  severity,
} = {}) {
  const resolvedRoot = path.resolve(root);
  const profile = await readProfile(resolvedRoot, profilePath);
  const selectedSeverity = selectSeverity(profile, severity);
  const palette = await paletteTokens(resolvedRoot, profile);
  const rawFindings = [
    ...(await runEslint(resolvedRoot, profile, selectedSeverity)),
    ...(await runStylelint(resolvedRoot, profile, selectedSeverity, palette)),
    ...(await runContracts(resolvedRoot, profile, selectedSeverity)),
  ];
  return {
    root: resolvedRoot,
    profilePath,
    severity: selectedSeverity,
    ...finalizeFindings(rawFindings, profile.exceptions ?? []),
  };
}

export function exitCodeForCheck(result) {
  return exitCodeForFindings(result);
}

function runCommand(command, cwd) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, { cwd, shell: true, stdio: "inherit" });
    child.on("error", reject);
    child.on("exit", (code, signal) => {
      if (code === 0) resolve();
      else
        reject(
          new Error(
            `Command failed${signal ? ` with ${signal}` : ` with exit code ${code}`}: ${command}`,
          ),
        );
    });
  });
}

export async function runProfileCommands({ root, profilePath = ".agents/css-modules.json" }) {
  const profile = await readProfile(root, profilePath);
  for (const id of ["css:generate", "css:types"]) await runCommand(profile.commands[id], root);
}

export function formatCheck(result) {
  return formatFindingsReport(result, "CSS Modules source checks");
}

function parseArgs(argv) {
  const options = {
    root: process.cwd(),
    profilePath: ".agents/css-modules.json",
    format: "human",
    runDeclarations: false,
  };
  for (let index = 0; index < argv.length; index += 1) {
    const argument = argv[index];
    if (argument === "--root") options.root = argv[++index];
    else if (argument === "--profile") options.profilePath = argv[++index];
    else if (argument === "--format") options.format = argv[++index];
    else if (argument === "--severity") options.severity = argv[++index];
    else if (argument === "--run-declarations") options.runDeclarations = true;
    else if (argument === "--help" || argument === "-h") options.help = true;
    else throw new Error(`Unknown argument: ${argument}`);
  }
  if (!["human", "json"].includes(options.format)) throw new Error("format must be human or json");
  return options;
}

function usage() {
  return [
    "Usage: node check.mjs [options]",
    "",
    "--root <path>          project root; defaults to cwd",
    "--profile <path>       profile path relative to root",
    "--severity <level>     warning or error; overrides the profile migration level",
    "--run-declarations     run css:generate and css:types before source/contract checks",
    "--format <human|json>  output format",
  ].join("\n");
}

async function main() {
  try {
    const options = parseArgs(process.argv.slice(2));
    if (options.help) {
      process.stdout.write(`${usage()}\n`);
      return;
    }
    if (options.runDeclarations) await runProfileCommands(options);
    const result = await checkProject(options);
    process.stdout.write(
      options.format === "json"
        ? `${JSON.stringify(result, null, 2)}\n`
        : `${formatCheck(result)}\n`,
    );
    process.exitCode = exitCodeForCheck(result);
  } catch (error) {
    process.stderr.write(`CSS Modules checks failed: ${error.message}\n`);
    process.exitCode = 2;
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  await main();
}
