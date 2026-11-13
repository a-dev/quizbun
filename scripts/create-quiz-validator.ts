import { existsSync, statSync } from "node:fs";
import { resolve } from "node:path";

import { loadPublicQuizzes } from "../src/shared/lib/content";

import { checkCatalogQuizzes, formatCatalogProfileSummary } from "./catalog-profile-validation";
import { validateRemoteMedia } from "./create-quiz-remote-media";
import {
  collectJsonFiles,
  parseAndValidateQuiz,
  readQuizFiles,
  toPathLabel,
} from "./quiz-validation";

/**
 * The standalone validator bundled into the `create-quiz` skill. It runs on
 * plain Node.js outside this repository, so it owns the profile orchestration
 * and the CLI contract; the shared mechanics live in `quiz-validation.ts` and
 * `catalog-profile-validation.ts`.
 */

export type ValidationProfile = "catalog" | "standard";

export interface ValidateTargetOptions {
  checkMedia: boolean;
  profile: ValidationProfile;
}

export interface ValidationReport {
  output: string;
  warnings: string[];
}

export interface CliOptions {
  checkMedia: boolean;
  help: boolean;
  profile: ValidationProfile;
  stdin: boolean;
  target?: string;
}

export const USAGE = `Usage:
  validate-quiz [--profile standard] [--check-media] <quiz.json|directory>
  validate-quiz --profile catalog [--check-media] <catalog-directory>
  validate-quiz [--profile standard] [--check-media] --stdin

Options:
  --profile <standard|catalog>  Validation profile (default: standard)
  --check-media                 Verify remote Images and YouTube ids over the network
  --stdin                       Read one Quiz JSON object from standard input
  -h, --help                    Show this help`;

export async function validateTarget(
  targetArg: string,
  options: ValidateTargetOptions,
): Promise<ValidationReport> {
  return options.profile === "catalog"
    ? validateCatalogDirectory(targetArg, options.checkMedia)
    : validateStandardTarget(targetArg, options.checkMedia);
}

export async function validateStandardInput(
  rawText: string,
  options: Pick<ValidateTargetOptions, "checkMedia">,
): Promise<ValidationReport> {
  const quiz = parseAndValidateQuiz(rawText, "standard input");

  if (options.checkMedia) {
    await validateRemoteMedia([{ fileLabel: "standard input", quiz }]);
  }

  return {
    output: "Validated 1 Quiz from standard input against the Quiz Object Standard.",
    warnings: [],
  };
}

/** The flag part of `CliOptions`, filled in one argument at a time. */
type CliFlags = Pick<CliOptions, "checkMedia" | "profile" | "stdin">;

export function parseCliArguments(args: string[]): CliOptions {
  const flags: CliFlags = { checkMedia: false, profile: "standard", stdin: false };
  let target: string | undefined;

  for (let index = 0; index < args.length; index += 1) {
    const argument = args[index];

    if (argument === undefined) continue;

    if (argument === "-h" || argument === "--help") {
      return { ...flags, help: true };
    }

    if (argument.startsWith("-")) {
      index += applyOption(flags, argument, args[index + 1]);
      continue;
    }

    if (target !== undefined) {
      throw new Error(
        `Provide one validation target, not both ${target} and ${argument}.\n\n${USAGE}`,
      );
    }

    target = argument;
  }

  assertTargetIsCoherent(flags, target);

  return { ...flags, help: false, ...(target !== undefined && { target }) };
}

/** Applies one `-`-prefixed option, returning how many extra arguments it consumed. */
function applyOption(flags: CliFlags, argument: string, next: string | undefined): number {
  if (argument === "--check-media") {
    flags.checkMedia = true;

    return 0;
  }

  if (argument === "--stdin" || argument === "-") {
    flags.stdin = true;

    return 0;
  }

  if (argument === "--profile") {
    flags.profile = toProfile(next);

    return 1;
  }

  if (argument.startsWith("--profile=")) {
    flags.profile = toProfile(argument.slice("--profile=".length));

    return 0;
  }

  throw new Error(`Unknown option: ${argument}\n\n${USAGE}`);
}

/** Exactly one source of Quiz JSON, and one the chosen profile can actually read. */
function assertTargetIsCoherent(flags: CliFlags, target: string | undefined) {
  if (flags.stdin && target !== undefined) {
    throw new Error("Use either `--stdin` or a file/directory target, not both.\n\n" + USAGE);
  }

  if (!flags.stdin && target === undefined) {
    throw new Error(`Provide a Quiz JSON file, directory, or \`--stdin\`.\n\n${USAGE}`);
  }

  if (flags.stdin && flags.profile === "catalog") {
    throw new Error(
      "Catalog validation requires a directory so filenames and Assets can be checked.",
    );
  }
}

function toProfile(value: string | undefined): ValidationProfile {
  if (value !== "catalog" && value !== "standard") {
    throw new Error("Set `--profile` to `standard` or `catalog`.\n\n" + USAGE);
  }

  return value;
}

async function validateStandardTarget(
  targetArg: string,
  checkMedia: boolean,
): Promise<ValidationReport> {
  const targetPath = resolve(process.cwd(), targetArg);
  const filePaths = collectJsonFiles(targetPath);

  if (filePaths.length === 0) {
    throw new Error(`No Quiz JSON files found in ${toPathLabel(targetPath)}.`);
  }

  const quizzes = readQuizFiles(filePaths);

  if (checkMedia) {
    await validateRemoteMedia(quizzes);
  }

  return {
    output: `Validated ${quizzes.length} Quiz file(s) from ${toPathLabel(targetPath)} against the Quiz Object Standard.`,
    warnings: [],
  };
}

async function validateCatalogDirectory(
  targetArg: string,
  checkMedia: boolean,
): Promise<ValidationReport> {
  const targetPath = resolve(process.cwd(), targetArg);

  if (!existsSync(targetPath) || !statSync(targetPath).isDirectory()) {
    throw new Error(
      `Catalog validation target must be a directory. Received: ${toPathLabel(targetPath)}.`,
    );
  }

  // The skill runs outside a git checkout, so there is no commit history to
  // date Quizzes from: pass an empty map and stay quiet about the fallback.
  const catalog = loadPublicQuizzes(targetPath, {
    addedAtByFileName: new Map(),
    warnOnDateFallback: false,
  });
  const report = checkCatalogQuizzes(catalog.quizzes, targetPath);
  const summary = formatCatalogProfileSummary(report, toPathLabel(targetPath));

  if (report.errorCount > 0) {
    throw new Error([...report.reports, summary].join("\n\n"));
  }

  if (checkMedia) {
    await validateRemoteMedia(
      catalog.quizzes.map((quiz) => ({
        fileLabel: toPathLabel(resolve(targetPath, `${quiz.id}.json`)),
        quiz,
      })),
    );
  }

  return { output: summary, warnings: report.reports };
}
