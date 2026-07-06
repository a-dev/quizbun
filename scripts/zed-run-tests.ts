import { existsSync } from "node:fs";
import { relative, resolve } from "node:path";

type Mode = "current-file" | "current-folder";

type Command = {
  args: string[];
  label: string;
};

const mode = process.argv[2] as Mode | undefined;
const targetArg = process.argv[3];

try {
  const targetPath = parseTargetPath(targetArg);
  const commands = getCommands(mode, targetPath);

  for (const command of commands) {
    runCommand(command);
  }
} catch (error) {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
}

function parseTargetPath(targetArg: string | undefined) {
  if (!targetArg) {
    throw new Error("Usage: bun scripts/zed-run-tests.ts <current-file|current-folder> <path>");
  }

  const targetPath = resolve(process.cwd(), targetArg);

  if (!existsSync(targetPath)) {
    throw new Error(`Test target does not exist: ${toWorkspacePathLabel(targetPath)}`);
  }

  return targetPath;
}

function getCommands(mode: Mode | undefined, targetPath: string): Command[] {
  switch (mode) {
    case "current-file":
      return getCurrentFileCommands(targetPath);
    case "current-folder":
      return getCurrentFolderCommands(targetPath);
    default:
      throw new Error(`Unknown Zed test mode: ${mode ?? "<missing>"}`);
  }
}

function getCurrentFileCommands(filePath: string): Command[] {
  if (filePath.endsWith(".e2e.ts")) {
    return [{ label: "Playwright e2e test file", args: ["bun", "run", "e2e", filePath] }];
  }

  if (filePath.endsWith(".spec.ts")) {
    return [
      {
        label: "Vitest unit test file",
        args: ["bunx", "vitest", "run", "--project", "unit", filePath],
      },
    ];
  }

  if (filePath.endsWith(".test.ts") || filePath.endsWith(".test.tsx")) {
    return [
      {
        label: "Vitest browser test file",
        args: ["bunx", "vitest", "run", "--project", "browser", filePath],
      },
    ];
  }

  return [
    {
      label: "Vitest tests related to current file",
      args: ["bunx", "vitest", "related", filePath, "--run"],
    },
  ];
}

function getCurrentFolderCommands(dirPath: string): Command[] {
  return [
    {
      label: "Vitest unit tests in current folder",
      args: ["bunx", "vitest", "run", "--project", "unit", dirPath, "--passWithNoTests"],
    },
    {
      label: "Vitest browser tests in current folder",
      args: ["bunx", "vitest", "run", "--project", "browser", dirPath, "--passWithNoTests"],
    },
    {
      label: "Playwright e2e tests in current folder",
      args: ["bun", "run", "e2e", dirPath, "--pass-with-no-tests"],
    },
  ];
}

function runCommand(command: Command) {
  console.log(`\n> ${command.label}`);
  console.log(command.args.map(quoteArg).join(" "));

  const result = Bun.spawnSync(command.args, {
    cwd: process.cwd(),
    stderr: "inherit",
    stdout: "inherit",
  });

  if (result.exitCode !== 0) {
    process.exit(result.exitCode);
  }
}

function quoteArg(arg: string) {
  return /\s/.test(arg) ? JSON.stringify(arg) : arg;
}

function toWorkspacePathLabel(filePath: string) {
  return relative(process.cwd(), filePath) || ".";
}
