#!/usr/bin/env node

import { spawn } from "node:child_process";
import { cp, mkdtemp, readdir, readFile, rm, symlink, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import process from "node:process";
import { fileURLToPath, pathToFileURL } from "node:url";

import { checkProject } from "./check.mjs";

const SCRIPT_ROOT = path.dirname(fileURLToPath(import.meta.url));
const SKILL_ROOT = path.dirname(SCRIPT_ROOT);
const REPOSITORY_ROOT = path.resolve(SKILL_ROOT, "../../..");
const FIXTURE_ROOT = path.join(SKILL_ROOT, "fixtures", "vite-react");

function run(command, args, options = {}) {
  return new Promise((resolve) => {
    const child = spawn(command, args, {
      cwd: options.cwd,
      env: process.env,
      stdio: ["ignore", "pipe", "pipe"],
    });
    let stdout = "";
    let stderr = "";
    child.stdout.on("data", (chunk) => {
      stdout += chunk;
    });
    child.stderr.on("data", (chunk) => {
      stderr += chunk;
    });
    child.on("close", (code) => resolve({ code, stdout, stderr }));
  });
}

async function findGeneratedDeclarations(directory, output = []) {
  const entries = await readdir(directory, { withFileTypes: true });
  for (const entry of entries) {
    const entryPath = path.join(directory, entry.name);
    if (entry.isDirectory()) {
      if (entry.name !== "node_modules" && entry.name !== "dist") {
        await findGeneratedDeclarations(entryPath, output);
      }
    } else if (entry.name.endsWith(".module.css.d.ts")) {
      output.push(entryPath);
    }
  }
  return output;
}

export async function verifyReferenceFixture() {
  const temporaryRoot = await mkdtemp(path.join(os.tmpdir(), "css-modules-reference-"));
  const fixture = path.join(temporaryRoot, "fixture");

  try {
    await cp(FIXTURE_ROOT, fixture, { recursive: true });
    await symlink(
      path.join(REPOSITORY_ROOT, "node_modules"),
      path.join(fixture, "node_modules"),
      "dir",
    );

    const vite = path.join(REPOSITORY_ROOT, "node_modules", ".bin", "vite");
    const buildResult = await run(
      vite,
      ["build", "--config", "vite.config.ts", "--configLoader", "runner", "--logLevel", "warn"],
      { cwd: fixture },
    );
    if (buildResult.code !== 0) {
      throw new Error(
        `Reference fixture build failed:\n${buildResult.stdout}${buildResult.stderr}`,
      );
    }
    const declarations = await findGeneratedDeclarations(fixture);
    const relativeDeclarations = declarations
      .map((filePath) => path.relative(fixture, filePath).split(path.sep).join("/"))
      .sort();
    if (relativeDeclarations.length < 3) {
      throw new Error(
        `Expected generated declarations for the fixture modules; found ${relativeDeclarations.length}`,
      );
    }
    for (const declaration of declarations) {
      if (!(await readFile(declaration, "utf8")).includes("sourceMappingURL=")) {
        throw new Error(
          `Generated declaration is missing its declaration map: ${path.relative(fixture, declaration)}`,
        );
      }
    }

    const tsc = path.join(REPOSITORY_ROOT, "node_modules", ".bin", "tsc");
    const typecheck = await run(tsc, [
      "--project",
      path.join(fixture, "tsconfig.json"),
      "--noEmit",
    ]);
    if (typecheck.code !== 0) {
      throw new Error(
        `Reference fixture typecheck failed:\n${typecheck.stdout}${typecheck.stderr}`,
      );
    }

    const sourceChecks = await checkProject({ root: fixture });
    if (sourceChecks.status !== "passed") {
      throw new Error(
        `Reference fixture source checks failed:\n${JSON.stringify(sourceChecks.findings, null, 2)}`,
      );
    }

    const componentPath = path.join(fixture, "src", "reference-button.tsx");
    const component = await readFile(componentPath, "utf8");
    await writeFile(
      componentPath,
      `${component}\nexport const invalidClassProbe = styles.missingClass;\n`,
    );
    const invalidTypecheck = await run(tsc, [
      "--project",
      path.join(fixture, "tsconfig.json"),
      "--noEmit",
    ]);
    if (invalidTypecheck.code === 0) {
      throw new Error("Generated declarations did not reject an invalid CSS Module class key");
    }

    return {
      declarations: "passed",
      declarationMaps: "passed",
      typecheck: "passed",
      build: "passed",
      sourceChecks: "passed",
      invalidClassKey: "rejected",
      generatedDeclarations: relativeDeclarations,
    };
  } finally {
    await rm(temporaryRoot, { recursive: true, force: true });
  }
}

async function main() {
  try {
    const result = await verifyReferenceFixture();
    process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
  } catch (error) {
    process.stderr.write(`Reference fixture failed: ${error.message}\n`);
    process.exitCode = 1;
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  await main();
}
