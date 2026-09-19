#!/usr/bin/env node

import { cp, mkdtemp, rm, symlink } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";

import { createServer } from "vite";

const scriptRoot = path.dirname(fileURLToPath(import.meta.url));
const skillRoot = path.dirname(scriptRoot);
const repositoryRoot = path.resolve(skillRoot, "../../..");
const sourceFixture = path.join(skillRoot, "fixtures", "vite-react");
const temporaryRoot = await mkdtemp(path.join(os.tmpdir(), "css-modules-browser-"));
const fixture = path.join(temporaryRoot, "fixture");

await cp(sourceFixture, fixture, { recursive: true });
await symlink(path.join(repositoryRoot, "node_modules"), path.join(fixture, "node_modules"), "dir");

// The copied fixture's own vite.config.ts is the single source of the adapter
// configuration; duplicating it inline here previously risked silent drift.
const server = await createServer({
  root: fixture,
  configFile: path.join(fixture, "vite.config.ts"),
  configLoader: "runner",
  logLevel: "error",
  server: { host: "127.0.0.1", port: 4173, strictPort: true },
});

await server.listen();

async function close() {
  await server.close();
  await rm(temporaryRoot, { recursive: true, force: true });
  process.exit(0);
}

process.on("SIGINT", close);
process.on("SIGTERM", close);
