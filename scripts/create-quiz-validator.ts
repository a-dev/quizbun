import { existsSync, statSync } from "node:fs";
import { resolve } from "node:path";

import { loadPublicQuizzes } from "../src/shared/lib/content";
import type { Quiz } from "../src/shared/lib/quiz";

import {
  checkCatalogQuizzes,
  collectJsonFiles,
  formatCatalogProfileSummary,
  type LabelledQuiz,
  parseAndValidateQuiz,
  readQuizFiles,
  toPathLabel,
} from "./quiz-validation";

/**
 * The standalone validator bundled into the `create-quiz` skill. It runs on
 * plain Node.js outside this repository, so it owns the profile orchestration
 * and the CLI contract; the mechanics it shares with the repository CI gates
 * live in `quiz-validation.ts`.
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

const MAX_MEDIA_CHECK_CONCURRENCY = 4;
const MEDIA_CHECK_TIMEOUT_MS = 15_000;

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

export function parseCliArguments(args: string[]): CliOptions {
  let checkMedia = false;
  let profile: ValidationProfile = "standard";
  let stdin = false;
  let target: string | undefined;

  for (let index = 0; index < args.length; index += 1) {
    const argument = args[index];

    if (argument === "-h" || argument === "--help") {
      return { checkMedia, help: true, profile, stdin };
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
      profile = toProfile(args[index + 1]);
      index += 1;
      continue;
    }

    if (argument?.startsWith("--profile=")) {
      profile = toProfile(argument.slice("--profile=".length));
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

  if (stdin && profile === "catalog") {
    throw new Error(
      "Catalog validation requires a directory so filenames and Assets can be checked.",
    );
  }

  return { checkMedia, help: false, profile, stdin, ...(target !== undefined && { target }) };
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

type RemoteMediaCheck =
  | { fileLabel: string; kind: "image"; path: string; value: string }
  | { fileLabel: string; kind: "youtube"; path: string; value: string };

/**
 * Opt-in network verification (`--check-media`). It requests only the
 * `https://` Image URLs and YouTube ids the Quiz itself names, so the target
 * list is author-supplied: keep it opt-in rather than wiring it into a gate
 * that runs over untrusted contributions.
 */
async function validateRemoteMedia(quizzes: LabelledQuiz[]): Promise<void> {
  const checks = quizzes.flatMap(({ fileLabel, quiz }) => listRemoteMediaChecks(fileLabel, quiz));
  const problems: string[] = [];

  for (let index = 0; index < checks.length; index += MAX_MEDIA_CHECK_CONCURRENCY) {
    const batch = checks.slice(index, index + MAX_MEDIA_CHECK_CONCURRENCY);
    const results = await Promise.all(batch.map(runRemoteMediaCheck));

    for (const result of results) {
      if (result !== undefined) problems.push(result);
    }
  }

  if (problems.length > 0) {
    throw new Error(
      [
        `Remote media verification failed with ${problems.length} problem(s):`,
        "",
        ...problems.map((problem, index) => `${index + 1}. ${problem}`),
      ].join("\n"),
    );
  }
}

function listRemoteMediaChecks(fileLabel: string, quiz: Quiz): RemoteMediaCheck[] {
  const checks: RemoteMediaCheck[] = [];

  for (const [questionIndex, question] of quiz.questions.entries()) {
    for (const [imageIndex, image] of (question.images ?? []).entries()) {
      if (!image.src.startsWith("https://")) continue;

      checks.push({
        fileLabel,
        kind: "image",
        path: `questions[${questionIndex}].images[${imageIndex}].src`,
        value: image.src,
      });
    }

    for (const [videoIndex, video] of (question.videos ?? []).entries()) {
      checks.push({
        fileLabel,
        kind: "youtube",
        path: `questions[${questionIndex}].videos[${videoIndex}].id`,
        value: video.id,
      });
    }
  }

  return checks;
}

async function runRemoteMediaCheck(check: RemoteMediaCheck): Promise<string | undefined> {
  try {
    if (check.kind === "image") {
      const response = await fetch(check.value, {
        redirect: "follow",
        signal: AbortSignal.timeout(MEDIA_CHECK_TIMEOUT_MS),
      });
      const contentType = response.headers.get("content-type") ?? "";
      await response.body?.cancel();

      if (!response.ok) {
        return formatMediaProblem(
          check,
          `Image request returned HTTP ${response.status}.`,
          "Use an existing public HTTPS Image URL, or omit the Image.",
        );
      }

      if (!contentType.toLowerCase().startsWith("image/")) {
        return formatMediaProblem(
          check,
          `Image request returned content type ${JSON.stringify(contentType || "unknown")}.`,
          "Use a URL that responds with an Image content type, or omit the Image.",
        );
      }

      return undefined;
    }

    const oEmbedUrl = new URL("https://www.youtube.com/oembed");
    oEmbedUrl.searchParams.set("url", `https://www.youtube.com/watch?v=${check.value}`);
    oEmbedUrl.searchParams.set("format", "json");
    const response = await fetch(oEmbedUrl, {
      signal: AbortSignal.timeout(MEDIA_CHECK_TIMEOUT_MS),
    });
    await response.body?.cancel();

    return response.ok
      ? undefined
      : formatMediaProblem(
          check,
          `YouTube oEmbed returned HTTP ${response.status}.`,
          "Use a verified public YouTube video id, or omit the Video.",
        );
  } catch (error) {
    return formatMediaProblem(
      check,
      `Request failed: ${error instanceof Error ? error.message : String(error)}`,
      "Check network access and the media identifier, then retry or omit the media.",
    );
  }
}

function formatMediaProblem(check: RemoteMediaCheck, problem: string, fix: string): string {
  return [
    `Path: \`${check.fileLabel}:${check.path}\``,
    `   Problem: ${problem}`,
    `   Fix: ${fix}`,
  ].join("\n");
}
