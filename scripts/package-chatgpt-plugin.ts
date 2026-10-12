import { spawnSync } from "node:child_process";
import { cpSync, existsSync, mkdirSync, readFileSync, readdirSync, rmSync } from "node:fs";
import { resolve } from "node:path";

import { checkChatgptPlugin } from "./check-chatgpt-plugin";

// Existing standalone skills remain authoritative and are never changed here.
// Assemble their resources beside the plugin-specific browser workflow.
const root = process.cwd();
const pluginDirectory = resolve(root, "plugins/quizbun");
const checkOnly = process.argv.includes("--check");
const resources = [
  ["LICENSE", "LICENSE"],
  ["public/icons/icon-512.png", "assets/icon.png"],
  ["skills/create-quiz/package.json", "skills/create-quiz/package.json"],
  [
    "skills/create-quiz/references/quiz-generation-prompt.md",
    "skills/create-quiz/references/quiz-generation-prompt.md",
  ],
  [
    "skills/create-quiz/references/quiz.v1.schema.json",
    "skills/create-quiz/references/quiz.v1.schema.json",
  ],
  ["skills/create-quiz/scripts/validate-quiz.mjs", "skills/create-quiz/scripts/validate-quiz.mjs"],
  ["skills/quizbun/scripts/open-quiz.mjs", "skills/create-quiz/scripts/open-quiz.mjs"],
] as const;

// Remove only the obsolete generated launcher from the former third skill.
const legacyLauncher = resolve(pluginDirectory, "skills/quizbun/scripts");
if (!checkOnly) rmSync(legacyLauncher, { recursive: true, force: true });
const legacySkillDirectory = resolve(pluginDirectory, "skills/quizbun");
if (
  !checkOnly &&
  existsSync(legacySkillDirectory) &&
  readdirSync(legacySkillDirectory).length === 0
) {
  rmSync(legacySkillDirectory, { recursive: true });
}

const skillNames = readdirSync(resolve(pluginDirectory, "skills"))
  .filter((name) => existsSync(resolve(pluginDirectory, "skills", name, "SKILL.md")))
  .sort();
if (skillNames.join(",") !== "create-quiz,setup") {
  throw new Error(`Expected exactly create-quiz and setup skills; found ${skillNames.join(", ")}.`);
}

for (const [source, destination] of resources) {
  const sourcePath = resolve(root, source);
  const destinationPath = resolve(pluginDirectory, destination);

  if (checkOnly) {
    if (!readFileSync(sourcePath).equals(readFileSync(destinationPath))) {
      throw new Error(
        `Plugin resource has drifted: ${destination}. Run bun run plugin:chatgpt:package.`,
      );
    }
  } else {
    cpSync(sourcePath, destinationPath, { recursive: true });
  }
}

checkChatgptPlugin(pluginDirectory);

if (checkOnly) {
  console.log("ChatGPT plugin resources match the standalone skills.");
} else {
  const outputDirectory = resolve(root, "tmp/chatgpt-plugin");
  mkdirSync(outputDirectory, { recursive: true });
  const archive = resolve(outputDirectory, "quizbun.zip");
  // Recreate the generated archive so removed files cannot survive a rebuild.
  rmSync(archive, { force: true });
  const zip = spawnSync(
    "zip",
    ["-q", "-r", archive, "plugin.json", "LICENSE", "skills", "assets"],
    {
      cwd: pluginDirectory,
      encoding: "utf8",
    },
  );

  if (zip.error || zip.status !== 0) {
    throw new Error(`Could not package the plugin: ${zip.error?.message ?? zip.stderr}`);
  }

  console.log(`Plugin folder: ${pluginDirectory}\nPlugin archive: ${archive}`);
}
