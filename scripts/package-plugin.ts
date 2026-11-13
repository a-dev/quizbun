import { spawnSync } from "node:child_process";
import {
  cpSync,
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  readdirSync,
  rmSync,
  statSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { extname, join, relative, resolve } from "node:path";

import { checkChatgptPlugin } from "./check-chatgpt-plugin";
import { checkClaudePlugin } from "./check-claude-plugin";

// Existing standalone skills remain authoritative and are never changed here.
// Assemble their resources beside the plugin-specific browser workflow.
const root = process.cwd();
const pluginDirectory = resolve(root, "plugins/quizbun");
// The ChatGPT manifest and its icon live outside the Claude plugin folder, so
// the Claude directory never sees a second manifest or an unused image.
const chatgptDirectory = resolve(root, "plugins/chatgpt");
const checkOnly = process.argv.includes("--check");
const resources = [
  ["LICENSE", "LICENSE"],
  // Claude directory listing icon: square, opaque, 512 px or larger.
  ["public/icons/icon-maskable-512.png", ".claude-plugin/icon.png"],
  [
    "skills/create-quiz/references/quiz-generation-prompt.md",
    "skills/create-quiz/references/quiz-generation-prompt.md",
  ],
  [
    "skills/create-quiz/references/quiz.v1.schema.json",
    "skills/create-quiz/references/quiz.v1.schema.json",
  ],
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
      throw new Error(`Plugin resource has drifted: ${destination}. Run bun run plugin:package.`);
    }
  } else {
    cpSync(sourcePath, destinationPath, { recursive: true });
  }
}

// The Claude directory accepts only Markdown, text, JSON, YAML, and images from
// unverified publishers. The skills validate with the import page's Validate
// action instead of shipping scripts, so neither package carries any.
if (!checkOnly) {
  rmSync(resolve(pluginDirectory, "skills/create-quiz/scripts"), { recursive: true, force: true });
}

const MAX_REVIEWABLE_FILE_BYTES = 256 * 1024;
const ALLOWED_EXTENSIONS = new Set([".md", ".txt", ".json", ".yaml", ".yml", ".png"]);
for (const entry of readdirSync(pluginDirectory, { recursive: true, withFileTypes: true })) {
  if (!entry.isFile()) continue;
  const filePath = resolve(entry.parentPath, entry.name);
  const label = relative(root, filePath);
  const extension = extname(entry.name).toLowerCase();
  if (entry.name !== "LICENSE" && !ALLOWED_EXTENSIONS.has(extension)) {
    throw new Error(
      `The Claude directory refuses this file type from unverified publishers: ${label}.`,
    );
  }
  if (readFileSync(filePath).subarray(0, 2).toString() === "#!") {
    throw new Error(`The Claude directory refuses files that start with #!: ${label}.`);
  }
  if (extension !== ".png" && statSync(filePath).size > MAX_REVIEWABLE_FILE_BYTES) {
    throw new Error(
      `Plugin file is over 256 KiB, so the Claude directory would hold it for review: ${label}.`,
    );
  }
}

if (
  existsSync(resolve(pluginDirectory, "plugin.json")) ||
  existsSync(resolve(pluginDirectory, "assets"))
) {
  throw new Error(
    "Keep the ChatGPT plugin.json and assets/ in plugins/chatgpt, not plugins/quizbun.",
  );
}

// Stage the ChatGPT package: shared LICENSE and skills plus its own manifest and icon.
const stagingDirectory = mkdtempSync(join(tmpdir(), "quizbun-chatgpt-plugin-"));
cpSync(resolve(chatgptDirectory, "plugin.json"), resolve(stagingDirectory, "plugin.json"));
cpSync(resolve(root, "public/icons/icon-512.png"), resolve(stagingDirectory, "assets/icon.png"));
cpSync(resolve(pluginDirectory, "LICENSE"), resolve(stagingDirectory, "LICENSE"));
cpSync(resolve(pluginDirectory, "skills"), resolve(stagingDirectory, "skills"), {
  recursive: true,
});

try {
  checkChatgptPlugin(stagingDirectory);
  checkClaudePlugin(
    pluginDirectory,
    resolve(chatgptDirectory, "plugin.json"),
    resolve(root, ".claude-plugin/marketplace.json"),
  );

  if (checkOnly) {
    console.log(
      "Plugin resources match the standalone skills; Claude file types, ChatGPT and Claude manifests pass.",
    );
  } else {
    // Served by the site at /plugins/chatgpt-plugin.zip; git-ignored, built in CI.
    const outputDirectory = resolve(root, "public/plugins");
    mkdirSync(outputDirectory, { recursive: true });
    const archive = resolve(outputDirectory, "chatgpt-plugin.zip");
    // Recreate the generated archive so removed files cannot survive a rebuild.
    rmSync(archive, { force: true });
    const zip = spawnSync(
      "zip",
      ["-q", "-r", archive, "plugin.json", "LICENSE", "skills", "assets"],
      {
        cwd: stagingDirectory,
        encoding: "utf8",
      },
    );

    if (zip.error || zip.status !== 0) {
      throw new Error(`Could not package the plugin: ${zip.error?.message ?? zip.stderr}`);
    }

    console.log(`Plugin folder: ${pluginDirectory}\nChatGPT plugin archive: ${archive}`);
  }
} finally {
  rmSync(stagingDirectory, { force: true, recursive: true });
}
