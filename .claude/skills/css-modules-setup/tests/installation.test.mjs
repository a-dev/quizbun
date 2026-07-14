import assert from "node:assert/strict";
import { cp, mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";

import { HOSTS, verifyInstallation } from "../scripts/verify-installation.mjs";

const SKILLS = ["css-modules-setup", "css-modules"];

async function createFixture(host, scope) {
  const root = await mkdtemp(path.join(os.tmpdir(), "css-modules-install-"));
  const projectRoot = path.join(root, "project");
  const home = path.join(root, "home");
  const canonicalRoot = path.join(root, "canonical");
  await mkdir(projectRoot, { recursive: true });
  await mkdir(home, { recursive: true });

  for (const name of SKILLS) {
    const source = path.join(canonicalRoot, name);
    await mkdir(path.join(source, "references"), { recursive: true });
    await writeFile(
      path.join(source, "SKILL.md"),
      `---\nname: ${name}\ndescription: fixture\n---\n\n# ${name}\n`,
    );
    await writeFile(path.join(source, "references", "contract.md"), "canonical\n");
    const base =
      scope === "project"
        ? path.join(projectRoot, HOSTS[host].project)
        : path.join(home, HOSTS[host].global);
    await mkdir(base, { recursive: true });
    await cp(source, path.join(base, name), { recursive: true });
  }
  return { root, projectRoot, home, canonicalRoot };
}

for (const host of Object.keys(HOSTS)) {
  for (const scope of ["project", "global"]) {
    test(`verifies ${host} ${scope} discovery against the canonical source`, async () => {
      const fixture = await createFixture(host, scope);
      try {
        const result = await verifyInstallation({ host, scope, ...fixture });
        assert.equal(result.status, "aligned");
        assert.ok(result.findings.every(({ status }) => status === "aligned"));
      } finally {
        await rm(fixture.root, { recursive: true, force: true });
      }
    });
  }
}

test("rejects an active project/global shadow instead of assuming host precedence", async () => {
  const fixture = await createFixture("codex", "project");
  try {
    const globalRoot = path.join(fixture.home, HOSTS.codex.global);
    await mkdir(globalRoot, { recursive: true });
    await cp(
      path.join(fixture.canonicalRoot, "css-modules"),
      path.join(globalRoot, "css-modules"),
      { recursive: true },
    );

    const result = await verifyInstallation({ host: "codex", scope: "project", ...fixture });
    assert.equal(result.status, "ambiguous");
    assert.ok(result.findings.some(({ id }) => id === "install.shadow.css-modules"));
  } finally {
    await rm(fixture.root, { recursive: true, force: true });
  }
});

test("detects a historical copy outside the canonical and active directories", async () => {
  const fixture = await createFixture("claude-code", "project");
  try {
    const historical = path.join(fixture.projectRoot, "articles/css/css-modules");
    await mkdir(historical, { recursive: true });
    await writeFile(
      path.join(historical, "SKILL.md"),
      "---\nname: css-modules\ndescription: old\n---\n",
    );

    const result = await verifyInstallation({
      host: "claude-code",
      scope: "project",
      ...fixture,
      scanRoots: [fixture.projectRoot],
    });
    assert.equal(result.status, "ambiguous");
    assert.ok(result.findings.some(({ id }) => id === "install.stale-copy.css-modules"));
  } finally {
    await rm(fixture.root, { recursive: true, force: true });
  }
});
