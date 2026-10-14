import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";

// The Claude Code manifest shares the skills folder with the ChatGPT package.
// Keep its identity in step with plugin.json and the repository marketplace.
// The marketplace installs from the CI-built plugin-dist branch, because the
// assembled resources are git-ignored on main.
export function checkClaudePlugin(directory: string, marketplacePath: string): void {
  const root = resolve(directory);
  const shared = JSON.parse(readFileSync(resolve(root, "plugin.json"), "utf8"));
  const manifest = JSON.parse(readFileSync(resolve(root, ".claude-plugin/plugin.json"), "utf8"));
  for (const field of ["name", "version", "description", "license"] as const) {
    if (manifest[field] !== shared[field]) {
      throw new Error(`Claude manifest ${field} must match plugin.json.`);
    }
  }
  if (manifest.skills || manifest.mcpServers || manifest.hooks || manifest.agents) {
    throw new Error("The Claude package must stay skills-only and use the default skills folder.");
  }

  const marketplace = JSON.parse(readFileSync(resolve(marketplacePath), "utf8"));
  const entry = marketplace.plugins?.find(
    (plugin: { name?: string }) => plugin.name === manifest.name,
  );
  // CI publishes the assembled folder to this branch; see publish-plugin-branch.sh.
  const source = entry?.source;
  if (
    source?.source !== "github" ||
    source.repo !== "a-dev/quizbun" ||
    source.ref !== "plugin-dist"
  ) {
    throw new Error(`Marketplace must install ${manifest.name} from a-dev/quizbun@plugin-dist.`);
  }
  if (!existsSync(resolve(root, "skills"))) throw new Error(`Missing skills in ${directory}.`);
  if (entry.description !== manifest.description) {
    throw new Error("Marketplace description must match the Claude manifest.");
  }
}

if (import.meta.main) {
  checkClaudePlugin(
    process.argv[2] ?? "plugins/quizbun",
    process.argv[3] ?? ".claude-plugin/marketplace.json",
  );
  console.log("Claude plugin manifest and marketplace match plugin.json.");
}
