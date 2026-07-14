#!/usr/bin/env node

import { spawn } from "node:child_process";
import { createRequire } from "node:module";
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import process from "node:process";
import { fileURLToPath, pathToFileURL } from "node:url";

import { oxlintRuleIds } from "../harness/oxlint-plugin.mjs";
import {
  exitCodeForFindings,
  finalizeFindings,
  formatFindingsReport,
  readProfile,
  resolveInside,
  selectSeverity,
} from "./lib.mjs";

const CATEGORY_NAMES = [
  "correctness",
  "nursery",
  "pedantic",
  "perf",
  "restriction",
  "style",
  "suspicious",
];

function oxlintBinary(root) {
  const resolvers = [
    createRequire(path.join(root, "package.json")),
    createRequire(import.meta.url),
  ];
  for (const resolveFrom of resolvers) {
    try {
      const packageJsonPath = resolveFrom.resolve("oxlint/package.json");
      return path.join(path.dirname(packageJsonPath), "bin", "oxlint");
    } catch {
      // Try the harness installation when a disposable test project has no dependencies.
    }
  }
  throw new Error(
    "Oxlint is not installed. Add the pinned oxlint dependency printed by the setup plan.",
  );
}

function runProcess(command, args, cwd) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, { cwd, stdio: ["ignore", "pipe", "pipe"] });
    let stdout = "";
    let stderr = "";
    child.stdout.on("data", (chunk) => {
      stdout += chunk;
    });
    child.stderr.on("data", (chunk) => {
      stderr += chunk;
    });
    child.on("error", reject);
    child.on("exit", (code, signal) => resolve({ code, signal, stdout, stderr }));
  });
}

function ruleIdOf(diagnostic) {
  const value = diagnostic.ruleId ?? diagnostic.code ?? "oxlint/parse-error";
  const match = String(value).match(/^([^()]+)\(([^()]+)\)$/);
  return match ? `${match[1]}/${match[2]}` : String(value);
}

function diagnosticLocation(diagnostic) {
  const label = diagnostic.labels?.find(({ primary }) => primary) ?? diagnostic.labels?.[0];
  const span = label?.span ?? diagnostic.span;
  return {
    line: diagnostic.line ?? span?.line ?? 1,
    column: diagnostic.column ?? span?.column ?? 1,
  };
}

function normalizeDiagnostics(payload, root, severity) {
  // Oxlint runs with the project root as cwd and may report either cwd-relative
  // or absolute file paths, so relative paths must resolve against root.
  const relativeToRoot = (file) => {
    return path.relative(root, path.resolve(root, file)).split(path.sep).join("/");
  };
  const parsed = JSON.parse(payload || "[]");
  if (Array.isArray(parsed) && parsed.some((item) => Array.isArray(item.messages))) {
    return parsed.flatMap((result) =>
      (result.messages ?? []).map((message) => ({
        engine: "oxlint",
        ruleId: ruleIdOf(message),
        file: relativeToRoot(result.filePath),
        line: message.line ?? 1,
        column: message.column ?? 1,
        message: message.message,
        severity,
      })),
    );
  }
  const diagnostics = Array.isArray(parsed) ? parsed : (parsed.diagnostics ?? []);
  return diagnostics.map((diagnostic) => ({
    engine: "oxlint",
    ruleId: ruleIdOf(diagnostic),
    file: relativeToRoot(diagnostic.filename ?? diagnostic.filePath ?? root),
    ...diagnosticLocation(diagnostic),
    message: diagnostic.message,
    severity,
  }));
}

export async function checkWithOxlint({
  root = process.cwd(),
  profilePath = ".agents/css-modules.json",
  severity,
} = {}) {
  const resolvedRoot = path.resolve(root);
  const profile = await readProfile(resolvedRoot, profilePath);
  const selectedSeverity = selectSeverity(profile, severity);

  const temporaryRoot = await mkdtemp(path.join(os.tmpdir(), "css-modules-oxlint-config-"));
  const configPath = path.join(temporaryRoot, ".oxlintrc.json");
  const pluginPath = fileURLToPath(new URL("../harness/oxlint-plugin.mjs", import.meta.url));
  const config = {
    categories: Object.fromEntries(CATEGORY_NAMES.map((name) => [name, "off"])),
    plugins: [],
    jsPlugins: [{ name: "css-modules", specifier: pathToFileURL(pluginPath).href }],
    rules: Object.fromEntries(
      oxlintRuleIds.map((id) => [
        `css-modules/${id}`,
        selectedSeverity === "error" ? "error" : "warn",
      ]),
    ),
    settings: {
      cssModules: {
        classNamesHelper: profile.helpers.classNames,
        cssVariablesHelper: profile.helpers.cssVariables,
        privateBooleanAttributes: profile.enforcement?.privateBooleanAttributes ?? ["data-loading"],
      },
    },
  };

  try {
    await writeFile(configPath, `${JSON.stringify(config, null, 2)}\n`);
    const target = resolveInside(resolvedRoot, profile.appRoot);
    const execution = await runProcess(
      process.execPath,
      [oxlintBinary(resolvedRoot), "--config", configPath, "--format", "json", target],
      resolvedRoot,
    );
    if (execution.signal || ![0, 1].includes(execution.code)) {
      throw new Error(
        execution.stderr.trim() ||
          execution.stdout.trim() ||
          `Oxlint exited with ${execution.signal ?? execution.code}`,
      );
    }
    const rawFindings = normalizeDiagnostics(execution.stdout, resolvedRoot, selectedSeverity);
    return {
      root: resolvedRoot,
      profilePath,
      severity: selectedSeverity,
      ...finalizeFindings(rawFindings, profile.exceptions ?? []),
    };
  } finally {
    await rm(temporaryRoot, { recursive: true, force: true });
  }
}

export function exitCodeForOxlint(result) {
  return exitCodeForFindings(result);
}

export function formatOxlint(result) {
  return formatFindingsReport(result, "CSS Modules Oxlint checks");
}

function parseArgs(argv) {
  const options = { root: process.cwd(), profilePath: ".agents/css-modules.json", format: "human" };
  for (let index = 0; index < argv.length; index += 1) {
    const argument = argv[index];
    if (argument === "--root") options.root = argv[++index];
    else if (argument === "--profile") options.profilePath = argv[++index];
    else if (argument === "--format") options.format = argv[++index];
    else if (argument === "--severity") options.severity = argv[++index];
    else if (argument === "--help" || argument === "-h") options.help = true;
    else throw new Error(`Unknown argument: ${argument}`);
  }
  if (!["human", "json"].includes(options.format)) throw new Error("format must be human or json");
  return options;
}

function usage() {
  return [
    "Usage: node check-oxlint.mjs [options]",
    "",
    "--root <path>          project root; defaults to cwd",
    "--profile <path>       profile path relative to root",
    "--severity <level>     warning or error; overrides the profile migration level",
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
    const result = await checkWithOxlint(options);
    process.stdout.write(
      options.format === "json"
        ? `${JSON.stringify(result, null, 2)}\n`
        : `${formatOxlint(result)}\n`,
    );
    process.exitCode = exitCodeForOxlint(result);
  } catch (error) {
    process.stderr.write(`CSS Modules Oxlint checks failed: ${error.message}\n`);
    process.exitCode = 2;
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  await main();
}
