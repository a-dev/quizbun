import { readFileSync } from "node:fs";

import {
  type ValidationProfile,
  validateStandardInput,
  validateTarget,
} from "./create-quiz-validator";

interface CliOptions {
  checkMedia: boolean;
  profile: ValidationProfile;
  stdin: boolean;
  target?: string;
}

const USAGE = `Usage:
  validate-quiz [--profile standard] [--check-media] <quiz.json|directory>
  validate-quiz --profile catalog [--check-media] <catalog-directory>
  validate-quiz [--profile standard] [--check-media] --stdin

Options:
  --profile <standard|catalog>  Validation profile (default: standard)
  --check-media                 Verify remote Images and YouTube ids over the network
  --stdin                       Read one Quiz JSON object from standard input
  -h, --help                    Show this help`;

try {
  const options = parseArguments(process.argv.slice(2));
  restoreNpmCallerWorkingDirectory();

  if (options.stdin && options.profile === "catalog") {
    throw new Error(
      "Catalog validation requires a directory so filenames and Assets can be checked.",
    );
  }

  const result = options.stdin
    ? await validateStandardInput(readFileSync(0, "utf8"), options)
    : await validateTarget(options.target ?? "", options);

  for (const warning of result.warnings) {
    console.warn(`${warning}\n`);
  }

  console.log(result.output);
} catch (error) {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
}

function restoreNpmCallerWorkingDirectory(): void {
  const npmCallerDirectory = process.env.INIT_CWD;

  if (process.env.npm_package_name === "create-quiz-skill" && npmCallerDirectory !== undefined) {
    process.chdir(npmCallerDirectory);
  }
}

function parseArguments(args: string[]): CliOptions {
  let checkMedia = false;
  let profile: ValidationProfile = "standard";
  let stdin = false;
  let target: string | undefined;

  for (let index = 0; index < args.length; index += 1) {
    const argument = args[index];

    if (argument === "-h" || argument === "--help") {
      console.log(USAGE);
      process.exit(0);
    }

    if (argument === "--check-media") {
      checkMedia = true;
      continue;
    }

    if (argument === "--stdin" || argument === "-") {
      stdin = true;
      continue;
    }

    if (argument === "--profile") {
      const value = args[index + 1];

      if (value !== "catalog" && value !== "standard") {
        throw new Error("Set `--profile` to `standard` or `catalog`.\n\n" + USAGE);
      }

      profile = value;
      index += 1;
      continue;
    }

    if (argument?.startsWith("--profile=")) {
      const value = argument.slice("--profile=".length);

      if (value !== "catalog" && value !== "standard") {
        throw new Error("Set `--profile` to `standard` or `catalog`.\n\n" + USAGE);
      }

      profile = value;
      continue;
    }

    if (argument?.startsWith("-")) {
      throw new Error(`Unknown option: ${argument}\n\n${USAGE}`);
    }

    if (target !== undefined) {
      throw new Error(
        `Provide one validation target, not both ${target} and ${argument}.\n\n${USAGE}`,
      );
    }

    target = argument;
  }

  if (stdin && target !== undefined) {
    throw new Error("Use either `--stdin` or a file/directory target, not both.\n\n" + USAGE);
  }

  if (!stdin && target === undefined) {
    throw new Error(`Provide a Quiz JSON file, directory, or \`--stdin\`.\n\n${USAGE}`);
  }

  return { checkMedia, profile, stdin, ...(target !== undefined && { target }) };
}
