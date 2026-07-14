#!/usr/bin/env node

import { createHash } from "node:crypto";
import { readFile, readdir, realpath } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import process from "node:process";
import { fileURLToPath, pathToFileURL } from "node:url";

import { exists } from "./lib.mjs";

export const HOSTS = {
  codex: { project: ".agents/skills", global: ".codex/skills" },
  "claude-code": { project: ".claude/skills", global: ".claude/skills" },
};

const SKILL_NAMES = ["css-modules-setup", "css-modules"];
const DEFAULT_CANONICAL_ROOT = fileURLToPath(new URL("../../", import.meta.url));
const SKIPPED_DIRECTORIES = new Set([".git", "node_modules", "dist", "build"]);

async function filesUnder(directory, output = [], prefix = "") {
  if (!(await exists(directory))) return output;
  const entries = (await readdir(directory, { withFileTypes: true })).sort((left, right) =>
    left.name.localeCompare(right.name),
  );
  for (const entry of entries) {
    if (SKIPPED_DIRECTORIES.has(entry.name) || entry.name === ".DS_Store") continue;
    const filePath = path.join(directory, entry.name);
    const relative = path.join(prefix, entry.name);
    if (entry.isDirectory()) await filesUnder(filePath, output, relative);
    else output.push({ filePath, relative: relative.split(path.sep).join("/") });
  }
  return output;
}

async function treeDigest(directory) {
  const hash = createHash("sha256");
  for (const { filePath, relative } of await filesUnder(directory)) {
    hash.update(relative);
    hash.update("\0");
    hash.update(await readFile(filePath));
    hash.update("\0");
  }
  return hash.digest("hex");
}

function skillName(source) {
  const match = source.match(/^---\s*\n[\s\S]*?^name:\s*([^\s#]+)[\s\S]*?^---\s*$/m);
  return match?.[1]?.replace(/^["']|["']$/g, "");
}

async function discoveredCopies(scanRoot) {
  const copies = [];
  for (const { filePath } of await filesUnder(scanRoot)) {
    if (path.basename(filePath) !== "SKILL.md") continue;
    const name = skillName(await readFile(filePath, "utf8"));
    if (SKILL_NAMES.includes(name)) copies.push({ name, directory: path.dirname(filePath) });
  }
  return copies;
}

async function sameLocation(left, right) {
  if (!(await exists(left)) || !(await exists(right))) return false;
  return (await realpath(left)) === (await realpath(right));
}

function installationRoot({ host, scope, projectRoot, home }) {
  const relative = HOSTS[host][scope];
  return scope === "project" ? path.join(projectRoot, relative) : path.join(home, relative);
}

export async function verifyInstallation({
  host,
  scope = "project",
  projectRoot = process.cwd(),
  home = os.homedir(),
  canonicalRoot = DEFAULT_CANONICAL_ROOT,
  scanRoots = [],
} = {}) {
  if (!HOSTS[host]) throw new Error(`host must be one of: ${Object.keys(HOSTS).join(", ")}`);
  if (!new Set(["project", "global"]).has(scope))
    throw new Error("scope must be project or global");

  const expectedRoot = installationRoot({ host, scope, projectRoot, home });
  const otherScope = scope === "project" ? "global" : "project";
  const otherRoot = installationRoot({ host, scope: otherScope, projectRoot, home });
  const findings = [];

  for (const name of SKILL_NAMES) {
    const expected = path.join(expectedRoot, name);
    const canonical = path.join(canonicalRoot, name);
    if (!(await exists(expected))) {
      findings.push({
        id: `install.expected.${name}`,
        status: "missing",
        path: expected,
        detail: "Skill is absent from the host discovery directory.",
      });
      continue;
    }
    const [installedDigest, canonicalDigest] = await Promise.all([
      treeDigest(expected),
      treeDigest(canonical),
    ]);
    findings.push(
      installedDigest === canonicalDigest
        ? {
            id: `install.expected.${name}`,
            status: "aligned",
            path: expected,
            detail: "Installed skill matches the canonical source.",
          }
        : {
            id: `install.expected.${name}`,
            status: "drifted",
            path: expected,
            detail: "Installed skill differs from the canonical source; update before use.",
          },
    );

    const shadow = path.join(otherRoot, name);
    if ((await exists(shadow)) && !(await sameLocation(expected, shadow))) {
      findings.push({
        id: `install.shadow.${name}`,
        status: "ambiguous",
        path: shadow,
        detail: `Both ${scope} and ${otherScope} copies exist. Remove or update the stale copy instead of relying on host precedence.`,
      });
    }
  }

  const allowed = [
    ...SKILL_NAMES.map((name) => path.join(expectedRoot, name)),
    ...SKILL_NAMES.map((name) => path.join(canonicalRoot, name)),
  ];
  for (const scanRoot of scanRoots) {
    for (const copy of await discoveredCopies(scanRoot)) {
      const isAllowed = (
        await Promise.all(allowed.map((directory) => sameLocation(copy.directory, directory)))
      ).some(Boolean);
      if (!isAllowed) {
        findings.push({
          id: `install.stale-copy.${copy.name}`,
          status: "ambiguous",
          path: copy.directory,
          detail: "A non-canonical skill copy can be mistaken for an active installation.",
        });
      }
    }
  }

  const status = findings.some(({ status: findingStatus }) => findingStatus === "ambiguous")
    ? "ambiguous"
    : findings.some(({ status: findingStatus }) => findingStatus === "drifted")
      ? "drifted"
      : findings.some(({ status: findingStatus }) => findingStatus === "missing")
        ? "missing"
        : "aligned";
  return { host, scope, expectedRoot, status, findings };
}

export function formatInstallation(result) {
  const lines = [`CSS Modules skill discovery: ${result.host} (${result.scope})`, ""];
  for (const finding of result.findings) {
    lines.push(`${finding.status.toUpperCase()} ${finding.id} ${finding.path}`);
    lines.push(`  ${finding.detail}`);
  }
  lines.push("", `Result: ${result.status}`);
  return lines.join("\n");
}

function parseArgs(argv) {
  const options = {
    projectRoot: process.cwd(),
    home: os.homedir(),
    scope: "project",
    scanRoots: [],
    format: "human",
  };
  for (let index = 0; index < argv.length; index += 1) {
    const argument = argv[index];
    if (argument === "--host") options.host = argv[++index];
    else if (argument === "--scope") options.scope = argv[++index];
    else if (argument === "--project-root") options.projectRoot = argv[++index];
    else if (argument === "--home") options.home = argv[++index];
    else if (argument === "--canonical") options.canonicalRoot = argv[++index];
    else if (argument === "--scan") options.scanRoots.push(argv[++index]);
    else if (argument === "--format") options.format = argv[++index];
    else if (argument === "--help" || argument === "-h") options.help = true;
    else throw new Error(`Unknown argument: ${argument}`);
  }
  if (!["human", "json"].includes(options.format)) throw new Error("format must be human or json");
  return options;
}

function usage() {
  return [
    "Usage: node verify-installation.mjs --host <codex|claude-code> [options]",
    "",
    "--scope <project|global>  installation scope",
    "--project-root <path>     project used for project-scope discovery",
    "--home <path>             home used for global-scope discovery",
    "--canonical <path>        canonical skills/frontend root; defaults to this installation",
    "--scan <path>             also detect historical copies under this root; repeatable",
    "--format <human|json>     output format",
  ].join("\n");
}

async function main() {
  try {
    const options = parseArgs(process.argv.slice(2));
    if (options.help) {
      process.stdout.write(`${usage()}\n`);
      return;
    }
    const result = await verifyInstallation(options);
    process.stdout.write(
      options.format === "json"
        ? `${JSON.stringify(result, null, 2)}\n`
        : `${formatInstallation(result)}\n`,
    );
    process.exitCode = result.status === "aligned" ? 0 : 1;
  } catch (error) {
    process.stderr.write(`Installation verification failed: ${error.message}\n`);
    process.exitCode = 2;
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  await main();
}
