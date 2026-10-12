import { existsSync, readFileSync, readdirSync } from "node:fs";
import { isAbsolute, relative, resolve } from "node:path";

function hasUnsupportedCharacters(value: string): boolean {
  return Array.from(value).some((character) => {
    const code = character.codePointAt(0)!;
    return (
      (code < 32 && ![9, 10, 13].includes(code)) ||
      code === 127 ||
      /[\u200B-\u200F\u2028\u2029\uFEFF]/u.test(character)
    );
  });
}

function requireText(value: unknown, label: string, limit: number, singleLine = true): string {
  if (
    typeof value !== "string" ||
    value.trim() === "" ||
    value.length > limit ||
    hasUnsupportedCharacters(value) ||
    (singleLine && /[\r\n]/u.test(value))
  ) {
    throw new Error(`Invalid ${label}: expected non-empty text of at most ${limit} characters.`);
  }
  return value;
}

function checkSkills(root: string): void {
  const skills = readdirSync(resolve(root, "skills"))
    .filter((name) => existsSync(resolve(root, "skills", name, "SKILL.md")))
    .sort();
  if (skills.join(",") !== "create-quiz,setup")
    throw new Error("Expected exactly create-quiz and setup.");
  for (const name of skills) {
    const path = resolve(root, "skills", name);
    const text = readFileSync(resolve(path, "SKILL.md"), "utf8");
    const match = /^---\n([\s\S]*?)\n---\n([\s\S]+)$/u.exec(text);
    if (!match) throw new Error(`Missing skill frontmatter or body: ${name}`);
    const metadata = Bun.YAML.parse(match[1]!) as { name?: string; description?: string };
    if (metadata.name !== name) throw new Error(`Skill name must match directory: ${name}`);
    requireText(metadata.description, `${name} description`, 1024, false);
    const ui = Bun.YAML.parse(readFileSync(resolve(path, "agents/openai.yaml"), "utf8")) as {
      interface?: { display_name?: string; short_description?: string };
    };
    requireText(ui.interface?.display_name, `${name} display_name`, 80);
    requireText(ui.interface?.short_description, `${name} short_description`, 64);
  }
}

/** Local publication preflight; OpenAI's portal still performs its own scans. */
export function checkChatgptPlugin(directory: string): void {
  const root = resolve(directory);
  const manifest = JSON.parse(readFileSync(resolve(root, "plugin.json"), "utf8"));
  const openai = manifest.extensions?.["com.openai"];
  const listing = openai?.interface;

  function bundledFile(value: unknown, label: string): string {
    const path = requireText(value, label, 2048);
    const target = resolve(root, path);
    const inside = relative(root, target);
    if (
      !path.startsWith("./") ||
      inside.startsWith("..") ||
      isAbsolute(inside) ||
      !existsSync(target)
    ) {
      throw new Error(`${label} must reference a bundled file inside the plugin.`);
    }
    return target;
  }

  if (!/^[a-z0-9][a-z0-9_-]*$/u.test(requireText(manifest.name, "name", 64))) {
    throw new Error("Invalid plugin name.");
  }
  if (!/^\d+\.\d+\.\d+$/u.test(requireText(manifest.version, "version", 64))) {
    throw new Error("Use a release version such as 0.3.0.");
  }
  requireText(manifest.description, "description", 1024, false);
  requireText(manifest.author?.name, "author.name", 120);
  requireText(listing?.displayName, "displayName", 30);
  requireText(listing?.shortDescription, "shortDescription", 30);
  requireText(listing?.longDescription, "longDescription", 4000, false);
  requireText(listing?.developerName, "developerName", 80);
  if (listing?.category !== "Education & Research")
    throw new Error("Expected Education & Research category.");
  const prompts = listing?.defaultPrompt;
  if (!Array.isArray(prompts) || prompts.length > 3)
    throw new Error("Expected up to three starter prompts.");
  const normalized = prompts.map((prompt) =>
    requireText(prompt, "starter prompt", 128).normalize("NFKC").replace(/\s+/gu, " ").trim(),
  );
  if (new Set(normalized).size !== prompts.length)
    throw new Error("Starter prompts must be unique.");

  if (
    manifest.mcpServers ||
    openai.apps ||
    openai.hooks ||
    listing.screenshots ||
    existsSync(resolve(root, "mcp.json")) ||
    existsSync(resolve(root, ".mcp.json")) ||
    existsSync(resolve(root, ".app.json"))
  ) {
    throw new Error(
      "This package must remain skills-only, without MCP configuration, hooks, or screenshots.",
    );
  }
  bundledFile(openai.onboardingSkill, "onboardingSkill");
  for (const field of ["logo", "composerIcon"]) {
    const bytes = readFileSync(bundledFile(listing[field], field));
    if (
      !bytes.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10])) ||
      bytes.length > 5 * 1024 * 1024
    ) {
      throw new Error(`${field} must be a PNG of at most 5 MiB.`);
    }
    const width = bytes.readUInt32BE(16);
    const height = bytes.readUInt32BE(20);
    if (width !== height || width < 48 || width > 4096)
      throw new Error(`${field} must be square, 48–4096 pixels.`);
  }

  checkSkills(root);
}

if (import.meta.main) {
  checkChatgptPlugin(process.argv[2] ?? "plugins/quizbun");
  console.log(
    "ChatGPT plugin publication preflight passed. Identity verification and portal scans remain external checks.",
  );
}
