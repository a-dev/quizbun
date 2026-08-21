import { execFileSync } from "node:child_process";
import { lstatSync, readdirSync, readFileSync } from "node:fs";
import { basename, relative, resolve } from "node:path";

import {
  ASSET_FILE_NAME_PATTERN,
  formatQuizValidationErrors,
  ID_PATTERN,
  parseQuizJson,
  type Quiz,
  quizSchema,
} from "../quiz";

/**
 * Build-time-only module: reads the repo filesystem, so it may be imported
 * from Astro frontmatter, `getStaticPaths`, and bun scripts — never from a
 * client island.
 */

/** Repo directory holding one `{id}.json` file per public Quiz. */
export const PUBLIC_QUIZZES_DIR = "content/quizzes";

/** Manually curated list of public Quiz ids to feature on the homepage. */
export const FEATURED_QUIZZES_FILE = "content/featured-quizzes.txt";

const MAX_ASSET_FILE_SIZE_BYTES = 512_000;

/** Metadata projection for Catalog lists; the build-time counterpart of the Library's `QuizSummary`. */
export interface PublicQuizSummary {
  id: string;
  title: string;
  description?: string;
  tags: string[];
  questionCount: number;
  /** ISO 8601 timestamp for when the public quiz file was added to the repo. */
  addedAt: string;
}

/** A Catalog Tag with the number of public quizzes carrying it. */
export interface TagCount {
  tag: string;
  count: number;
}

export interface PublicCatalog {
  /** Validated quizzes in filename order. */
  quizzes: Quiz[];
  /** One summary per quiz, same order as `quizzes`. */
  summaries: PublicQuizSummary[];
  /** Deduplicated Tags sorted alphabetically. */
  tags: TagCount[];
}

interface LoadPublicQuizzesOptions {
  addedAtByFileName?: ReadonlyMap<string, string>;
  now?: Date;
  warnOnDateFallback?: boolean;
}

/**
 * Loads every public quiz from the content directory, validating each file
 * against the Standard. Any invalid file, duplicate id, or filename ≠ id is
 * a thrown error — the build must never silently ship a broken Catalog.
 */
export function loadPublicQuizzes(
  contentDir: string = PUBLIC_QUIZZES_DIR,
  options: LoadPublicQuizzesOptions = {},
): PublicCatalog {
  const directoryPath = resolve(process.cwd(), contentDir);
  const fileNames = listQuizFileNames(directoryPath);
  const fileNameByQuizId = new Map<string, string>();
  const addedAtByFileName = options.addedAtByFileName ?? loadPublicQuizAddedDates(contentDir);
  const fallbackAddedAt = (options.now ?? new Date()).toISOString();
  const quizzes: Quiz[] = [];
  let fallbackDateCount = 0;

  for (const fileName of fileNames) {
    const fileLabel = toWorkspacePathLabel(resolve(directoryPath, fileName));
    const quiz = parseAndValidateQuizFile(directoryPath, fileName, fileLabel);

    const existingFileName = fileNameByQuizId.get(quiz.id);
    if (existingFileName !== undefined) {
      throw new Error(
        [
          `Duplicate quiz id in ${fileLabel}:`,
          "Path: `id`",
          `Problem: The id "${quiz.id}" is already used by ${existingFileName}.`,
          "Fix: Give each public quiz a repo-wide unique `id`.",
        ].join("\n"),
      );
    }
    fileNameByQuizId.set(quiz.id, fileName);

    const expectedFileName = `${quiz.id}.json`;
    if (fileName !== expectedFileName) {
      throw new Error(
        [
          `Filename does not match the quiz id in ${fileLabel}:`,
          "Path: `id`",
          `Problem: The quiz id is "${quiz.id}" but the file is named "${fileName}".`,
          `Fix: Rename the file to \`${expectedFileName}\` (or fix the \`id\`).`,
        ].join("\n"),
      );
    }

    quizzes.push(quiz);
  }

  validatePublicQuizAssets(directoryPath, quizzes);

  const summaries = quizzes.map((quiz) => {
    const fileName = fileNameByQuizId.get(quiz.id);
    const addedAt = fileName === undefined ? undefined : addedAtByFileName.get(fileName);

    if (addedAt === undefined) fallbackDateCount += 1;

    return toPublicQuizSummary(quiz, addedAt ?? fallbackAddedAt);
  });

  warnWhenLikelyShallowGitHistory({
    contentDir,
    fallbackDateCount,
    quizCount: quizzes.length,
    warnOnDateFallback: options.warnOnDateFallback ?? true,
  });

  return {
    quizzes,
    summaries,
    tags: countTags(quizzes),
  };
}

export function parsePublicQuizAddedDates(
  gitLogOutput: string,
  contentDir: string = PUBLIC_QUIZZES_DIR,
): Map<string, string> {
  const addedAtByFileName = new Map<string, string>();
  const contentPathPrefix = `${contentDir.replace(/\/+$/, "")}/`;
  let currentAddedAt: string | undefined;

  for (const line of gitLogOutput.split(/\r?\n/)) {
    if (line === "") continue;

    if (isIsoDateLine(line)) {
      currentAddedAt = line;
      continue;
    }

    if (currentAddedAt === undefined) continue;

    const [status, filePath] = line.split("\t");
    if (status !== "A" || filePath === undefined) continue;
    if (!filePath.startsWith(contentPathPrefix) || !filePath.endsWith(".json")) continue;

    const fileName = basename(filePath);
    const existingAddedAt = addedAtByFileName.get(fileName);

    if (existingAddedAt === undefined || Date.parse(currentAddedAt) < Date.parse(existingAddedAt)) {
      addedAtByFileName.set(fileName, currentAddedAt);
    }
  }

  return addedAtByFileName;
}

export function selectRecentQuizzes(
  summaries: readonly PublicQuizSummary[],
  count: number,
): PublicQuizSummary[] {
  return [...summaries]
    .sort((left, right) => {
      const dateOrder = Date.parse(right.addedAt) - Date.parse(left.addedAt);
      if (dateOrder !== 0) return dateOrder;

      return left.id.localeCompare(right.id, "en");
    })
    .slice(0, count);
}

export function loadFeaturedQuizIds(filePath: string = FEATURED_QUIZZES_FILE): string[] {
  const resolvedPath = resolve(process.cwd(), filePath);
  let fileContents: string;

  try {
    fileContents = readFileSync(resolvedPath, "utf8");
  } catch (error) {
    throw new Error(`Featured quizzes file not found: ${toWorkspacePathLabel(resolvedPath)}.`, {
      cause: error,
    });
  }

  return parseFeaturedQuizIds(fileContents, toWorkspacePathLabel(resolvedPath));
}

export function parseFeaturedQuizIds(fileContents: string, sourceLabel: string): string[] {
  const ids: string[] = [];
  const seenLinesById = new Map<string, number>();

  for (const [index, rawLine] of fileContents.split(/\r?\n/).entries()) {
    const lineNumber = index + 1;
    const quizId = rawLine.trim();

    if (quizId === "" || quizId.startsWith("#")) continue;

    if (!ID_PATTERN.test(quizId)) {
      throw new Error(
        [
          `Invalid featured Quiz id in ${sourceLabel}:`,
          `Path: line ${lineNumber}`,
          `Problem: "${quizId}" is not a valid Quiz id.`,
          "Fix: Use one public Quiz id per line, in kebab-case with lowercase latin letters, digits, and single hyphens.",
        ].join("\n"),
      );
    }

    const firstLineNumber = seenLinesById.get(quizId);
    if (firstLineNumber !== undefined) {
      throw new Error(
        [
          `Duplicate featured Quiz id in ${sourceLabel}:`,
          `Path: line ${lineNumber}`,
          `Problem: "${quizId}" is already listed on line ${firstLineNumber}.`,
          "Fix: Keep each featured Quiz id only once.",
        ].join("\n"),
      );
    }

    seenLinesById.set(quizId, lineNumber);
    ids.push(quizId);
  }

  return ids;
}

export function selectFeaturedQuizzes(
  summaries: readonly PublicQuizSummary[],
  featuredIds: readonly string[],
  sourceLabel: string = FEATURED_QUIZZES_FILE,
): PublicQuizSummary[] {
  const summariesById = new Map(summaries.map((summary) => [summary.id, summary]));

  return featuredIds.map((quizId) => {
    const summary = summariesById.get(quizId);

    if (summary === undefined) {
      throw new Error(
        [
          `Featured Quiz id not found in ${sourceLabel}:`,
          `Path: \`${quizId}\``,
          `Problem: "${quizId}" does not match any public Quiz id in ${PUBLIC_QUIZZES_DIR}.`,
          "Fix: Add the public Quiz JSON file, or remove/fix the id in the featured list.",
        ].join("\n"),
      );
    }

    return summary;
  });
}

function loadPublicQuizAddedDates(contentDir: string) {
  try {
    const gitLogOutput = execFileSync(
      "git",
      ["log", "--diff-filter=A", "--name-status", "--format=%aI", "--", contentDir],
      {
        cwd: process.cwd(),
        encoding: "utf8",
        stdio: ["ignore", "pipe", "ignore"],
      },
    );

    return parsePublicQuizAddedDates(gitLogOutput, contentDir);
  } catch {
    return new Map<string, string>();
  }
}

function listQuizFileNames(directoryPath: string) {
  let entryNames: string[];

  try {
    entryNames = readdirSync(directoryPath);
  } catch (error) {
    throw new Error(`Public quizzes directory not found: ${toWorkspacePathLabel(directoryPath)}.`, {
      cause: error,
    });
  }

  return entryNames
    .filter((entryName) => entryName.endsWith(".json"))
    .sort((left, right) => left.localeCompare(right, "en"));
}

function parseAndValidateQuizFile(directoryPath: string, fileName: string, fileLabel: string) {
  const quizJson = parseQuizJson(readFileSync(resolve(directoryPath, fileName), "utf8"), fileLabel);
  const result = quizSchema.safeParse(quizJson);

  if (!result.success) {
    throw new Error(
      [`Public quiz is invalid in ${fileLabel}:`, formatQuizValidationErrors(result.error)].join(
        "\n",
      ),
    );
  }

  return result.data;
}

function validatePublicQuizAssets(directoryPath: string, quizzes: readonly Quiz[]) {
  const quizzesById = new Map(quizzes.map((quiz) => [quiz.id, quiz]));
  const referencedFilesByQuizId = new Map<string, Set<string>>();

  for (const quiz of quizzes) {
    const referencedFiles = new Set<string>();
    referencedFilesByQuizId.set(quiz.id, referencedFiles);

    for (const [questionIndex, question] of quiz.questions.entries()) {
      for (const [imageIndex, image] of (question.images ?? []).entries()) {
        const fieldPath = `questions[${questionIndex}].images[${imageIndex}].src`;

        if (image.src.startsWith("https://")) {
          throw assetValidationError({
            fileLabel: toWorkspacePathLabel(resolve(directoryPath, `${quiz.id}.json`)),
            heading: "Remote Image is not allowed in a public Quiz",
            path: fieldPath,
            problem: `The Image source "${image.src}" is remote, but Catalog Images must be vendored in the repository.`,
            fix: `Download the Image into "${toWorkspacePathLabel(resolve(directoryPath, quiz.id))}" and replace the src value with its bare asset filename.`,
          });
        }

        referencedFiles.add(image.src);
        const assetPath = resolve(directoryPath, quiz.id, image.src);

        if (!isRegularFile(assetPath)) {
          throw assetValidationError({
            fileLabel: toWorkspacePathLabel(resolve(directoryPath, `${quiz.id}.json`)),
            heading: "Referenced Quiz asset is missing",
            path: fieldPath,
            problem: `The Image references "${image.src}", but "${toWorkspacePathLabel(assetPath)}" is not a file.`,
            fix: `Add the file to "${toWorkspacePathLabel(resolve(directoryPath, quiz.id))}", or fix/remove this Image reference.`,
          });
        }
      }
    }
  }

  const assetFolders = readdirSync(directoryPath, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .sort((left, right) => left.name.localeCompare(right.name, "en"));

  for (const assetFolder of assetFolders) {
    const folderPath = resolve(directoryPath, assetFolder.name);
    const quiz = quizzesById.get(assetFolder.name);

    if (quiz === undefined) {
      throw assetValidationError({
        fileLabel: toWorkspacePathLabel(folderPath),
        heading: "Orphan Quiz asset folder",
        path: toWorkspacePathLabel(folderPath),
        problem: `The asset folder "${assetFolder.name}" does not match any public Quiz id.`,
        fix: "Remove the folder, rename it to match its Quiz id, or add the matching public Quiz JSON file.",
      });
    }

    const referencedFiles = referencedFilesByQuizId.get(quiz.id) ?? new Set<string>();
    const assetEntries = readdirSync(folderPath, { withFileTypes: true }).sort((left, right) =>
      left.name.localeCompare(right.name, "en"),
    );

    for (const assetEntry of assetEntries) {
      const assetPath = resolve(folderPath, assetEntry.name);
      const assetLabel = toWorkspacePathLabel(assetPath);

      if (!assetEntry.isFile() || !ASSET_FILE_NAME_PATTERN.test(assetEntry.name)) {
        throw assetValidationError({
          fileLabel: assetLabel,
          heading: "Invalid Quiz asset filename",
          path: assetLabel,
          problem: `"${assetEntry.name}" is not a bare kebab-case asset filename with an allowed image extension.`,
          fix: "Rename it using lowercase latin letters, digits, and single hyphens plus png/jpg/jpeg/webp/avif/gif/svg, then update its Image reference.",
        });
      }

      if (!referencedFiles.has(assetEntry.name)) {
        throw assetValidationError({
          fileLabel: assetLabel,
          heading: "Orphan Quiz asset file",
          path: assetLabel,
          problem: `The file is not referenced by any Image in ${quiz.id}.json.`,
          fix: "Remove the file, or add its bare filename to an Image `src` in the Quiz.",
        });
      }

      const fileSize = lstatSync(assetPath).size;
      if (fileSize > MAX_ASSET_FILE_SIZE_BYTES) {
        throw assetValidationError({
          fileLabel: assetLabel,
          heading: "Quiz asset file is too large",
          path: assetLabel,
          problem: `The file is ${fileSize} bytes; the per-file limit is ${MAX_ASSET_FILE_SIZE_BYTES} bytes (500 KB).`,
          fix: "Compress or resize the Image so the file is at most 500 KB.",
        });
      }
    }
  }
}

function isRegularFile(filePath: string) {
  try {
    return lstatSync(filePath).isFile();
  } catch {
    return false;
  }
}

function assetValidationError({
  fileLabel,
  heading,
  path,
  problem,
  fix,
}: {
  fileLabel: string;
  heading: string;
  path: string;
  problem: string;
  fix: string;
}) {
  return new Error(
    [`${heading} in ${fileLabel}:`, `Path: \`${path}\``, `Problem: ${problem}`, `Fix: ${fix}`].join(
      "\n",
    ),
  );
}

function toPublicQuizSummary(quiz: Quiz, addedAt: string): PublicQuizSummary {
  return {
    id: quiz.id,
    title: quiz.title,
    ...(quiz.description !== undefined && { description: quiz.description }),
    tags: quiz.tags,
    questionCount: quiz.questions.length,
    addedAt,
  };
}

function countTags(quizzes: readonly Quiz[]): TagCount[] {
  const counts = new Map<string, number>();

  for (const quiz of quizzes) {
    for (const tag of quiz.tags) {
      counts.set(tag, (counts.get(tag) ?? 0) + 1);
    }
  }

  return [...counts.entries()]
    .sort(([left], [right]) => left.localeCompare(right, "en"))
    .map(([tag, count]) => ({ tag, count }));
}

function toWorkspacePathLabel(filePath: string) {
  return relative(process.cwd(), filePath) || filePath;
}

function isIsoDateLine(line: string) {
  return /^\d{4}-\d{2}-\d{2}T/.test(line);
}

function warnWhenLikelyShallowGitHistory({
  contentDir,
  fallbackDateCount,
  quizCount,
  warnOnDateFallback,
}: {
  contentDir: string;
  fallbackDateCount: number;
  quizCount: number;
  warnOnDateFallback: boolean;
}) {
  if (!warnOnDateFallback || quizCount === 0 || fallbackDateCount <= quizCount / 2) return;

  console.warn(
    [
      `Warning: ${fallbackDateCount} of ${quizCount} public quiz added dates fell back to the current build time.`,
      `This often means git history is unavailable or shallow for ${contentDir}.`,
      "CI should check out the repository with fetch-depth: 0 so recently added quizzes sort correctly.",
    ].join("\n"),
  );
}
