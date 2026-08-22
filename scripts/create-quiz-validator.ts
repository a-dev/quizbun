import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import { basename, extname, relative, resolve } from "node:path";

import {
  checkCatalogProfile,
  formatProfileIssues,
  loadPublicQuizzes,
} from "../src/shared/lib/content";
import {
  formatQuizValidationErrors,
  parseQuizJson,
  type Quiz,
  quizSchema,
} from "../src/shared/lib/quiz";

export type ValidationProfile = "catalog" | "standard";

export interface ValidateTargetOptions {
  checkMedia: boolean;
  profile: ValidationProfile;
}

export interface ValidationReport {
  output: string;
  warnings: string[];
}

const MAX_MEDIA_CHECK_CONCURRENCY = 4;
const MEDIA_CHECK_TIMEOUT_MS = 15_000;

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

async function validateStandardTarget(
  targetArg: string,
  checkMedia: boolean,
): Promise<ValidationReport> {
  const targetPath = resolve(process.cwd(), targetArg);
  const filePaths = collectJsonFiles(targetPath);

  if (filePaths.length === 0) {
    throw new Error(`No Quiz JSON files found in ${toPathLabel(targetPath)}.`);
  }

  const quizzes = filePaths.map((filePath) => ({
    fileLabel: toPathLabel(filePath),
    quiz: parseAndValidateQuiz(readFileSync(filePath, "utf8"), toPathLabel(filePath)),
  }));

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

  const catalog = loadPublicQuizzes(targetPath, {
    addedAtByFileName: new Map(),
    warnOnDateFallback: false,
  });
  const warnings: string[] = [];
  let errorCount = 0;
  let warningCount = 0;

  for (const quiz of catalog.quizzes) {
    const issues = checkCatalogProfile(quiz);

    if (issues.length === 0) continue;

    const report = formatProfileIssues(toPathLabel(resolve(targetPath, `${quiz.id}.json`)), issues);
    warnings.push(report);

    for (const issue of issues) {
      if (issue.severity === "error") {
        errorCount += 1;
      } else {
        warningCount += 1;
      }
    }
  }

  if (errorCount > 0) {
    throw new Error(
      [
        ...warnings,
        `Public catalog profile check failed: ${errorCount} error(s), ${warningCount} warning(s) across ${catalog.quizzes.length} Quiz file(s) in ${toPathLabel(targetPath)}.`,
      ].join("\n\n"),
    );
  }

  if (checkMedia) {
    await validateRemoteMedia(
      catalog.quizzes.map((quiz) => ({
        fileLabel: toPathLabel(resolve(targetPath, `${quiz.id}.json`)),
        quiz,
      })),
    );
  }

  return {
    output: `Validated ${catalog.quizzes.length} public Quiz file(s) from ${toPathLabel(targetPath)} against the Public catalog profile (${warningCount} warning(s)).`,
    warnings,
  };
}

function parseAndValidateQuiz(rawText: string, sourceLabel: string): Quiz {
  const quizJson = parseQuizJson(rawText, sourceLabel);
  const result = quizSchema.safeParse(quizJson);

  if (!result.success) {
    throw new Error(
      [`Quiz validation failed in ${sourceLabel}:`, formatQuizValidationErrors(result.error)].join(
        "\n",
      ),
    );
  }

  return result.data;
}

function collectJsonFiles(targetPath: string): string[] {
  if (!existsSync(targetPath)) {
    throw new Error(`Validation target does not exist: ${toPathLabel(targetPath)}.`);
  }

  const stats = statSync(targetPath);

  if (stats.isDirectory()) {
    return readdirSync(targetPath)
      .filter((entryName) => entryName.endsWith(".json"))
      .sort((left, right) => left.localeCompare(right, "en"))
      .map((entryName) => resolve(targetPath, entryName));
  }

  if (stats.isFile() && extname(targetPath) === ".json") {
    return [targetPath];
  }

  throw new Error(
    `Validation target must be a JSON file or directory. Received: ${toPathLabel(targetPath)}.`,
  );
}

async function validateRemoteMedia(
  quizzes: Array<{ fileLabel: string; quiz: Quiz }>,
): Promise<void> {
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

type RemoteMediaCheck =
  | { fileLabel: string; kind: "image"; path: string; value: string }
  | { fileLabel: string; kind: "youtube"; path: string; value: string };

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

function toPathLabel(filePath: string): string {
  return relative(process.cwd(), filePath) || basename(filePath);
}
