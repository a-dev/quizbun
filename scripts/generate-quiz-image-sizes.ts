import { readFileSync, writeFileSync } from "node:fs";
import { basename, resolve } from "node:path";

// Keep this CLI renderer-free: the content barrel also loads Markdown
// sanitization dependencies that Bun cannot resolve from every entry graph.
import { readImageDimensions } from "../src/shared/lib/content/image-dimensions";
import {
  applyJsonEdits,
  createMemberInsertion,
  findMember,
  type JsonMember,
  type JsonNode,
  parseJsonSource,
  type SourceEdit,
} from "./json-source-edit";
import { parseQuizJson } from "../src/shared/lib/quiz";

import { collectJsonFiles, parseAndValidateQuiz, toPathLabel } from "./quiz-validation";

/**
 * Writes the Standard v1.2 Image `width`/`height` into Catalog Quiz JSON, read
 * from the vendored asset files themselves.
 *
 * The values are generated rather than authored on purpose: a person guesses
 * and a model fabricates, and a wrong pair is worse than an absent one because
 * the Renderer then reserves the wrong box. `--check` is the CI half of the
 * same pass, so re-cropping an image without regenerating fails the build.
 *
 * Edits are spliced into the source text rather than reserialized:
 * `content/quizzes/**` is outside the formatter's reach, so rewriting a file
 * would reformat every line and bury the migration in noise.
 */

const CHECK_ONLY = process.argv.includes("--check");
const DEFAULT_CONTENT_DIR = "content/quizzes";
const targetPath = resolve(
  process.cwd(),
  process.argv.slice(2).find((argument) => !argument.startsWith("--")) ?? DEFAULT_CONTENT_DIR,
);

interface QuizFileResult {
  changes: string[];
  fileLabel: string;
  filePath: string;
  updatedSource: string | undefined;
}

try {
  const results = collectJsonFiles(targetPath).map(processQuizFile);
  const changedFiles = results.filter((result) => result.changes.length > 0);
  const changeCount = changedFiles.reduce((total, result) => total + result.changes.length, 0);

  if (CHECK_ONLY) {
    reportCheck(results.length, changedFiles, changeCount);
  } else {
    for (const result of changedFiles) {
      if (result.updatedSource !== undefined) {
        writeFileSync(result.filePath, result.updatedSource);
      }
    }

    console.log(
      changeCount === 0
        ? `Image dimensions are already current in ${results.length} Quiz file(s).`
        : `Wrote ${changeCount} Image dimension(s) across ${changedFiles.length} of ${results.length} Quiz file(s).`,
    );
  }
} catch (error) {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
}

function reportCheck(fileCount: number, changedFiles: QuizFileResult[], changeCount: number) {
  if (changeCount === 0) {
    console.log(`Image dimensions are current in ${fileCount} Quiz file(s).`);
    return;
  }

  console.error("Image dimensions are out of date:\n");

  for (const result of changedFiles) {
    console.error(`${result.fileLabel}:`);

    for (const change of result.changes) {
      console.error(`  ${change}`);
    }

    console.error("");
  }

  console.error(
    `${changeCount} Image(s) in ${changedFiles.length} file(s) need regenerating.\n` +
      "Run `bun run quiz:sizes:generate` and commit the result.",
  );
  process.exitCode = 1;
}

function processQuizFile(filePath: string): QuizFileResult {
  const fileLabel = toPathLabel(filePath);
  const source = readFileSync(filePath, "utf8");

  // Syntax first, so a malformed file gets the Standard's own JSON report
  // rather than a parse error from the offset scanner below.
  parseQuizJson(source, fileLabel);

  const assetDirectory = resolve(filePath, "..", basename(filePath, ".json"));
  const root = parseJsonSource(source);
  const changes: string[] = [];
  const edits: SourceEdit[] = [];

  for (const { imageNode, path } of listImageNodes(root)) {
    const srcValue = findMember(imageNode, "src")?.value;

    if (srcValue === undefined) continue;

    const src = JSON.parse(source.slice(srcValue.start, srcValue.end)) as string;

    // Remote Images are unmeasurable offline, and CI makes no network requests.
    // The Public catalog profile rejects them anyway, so this only matters when
    // the script is pointed at a non-catalog file.
    if (src.startsWith("https://")) continue;

    const assetPath = resolve(assetDirectory, src);
    let dimensions;

    try {
      dimensions = readImageDimensions(assetPath);
    } catch (error) {
      throw new Error(
        [
          `Could not read Image dimensions for ${fileLabel}:`,
          `  Path: ${path}.src`,
          `  Image: ${toPathLabel(assetPath)}`,
          `  Problem: ${describeReadFailure(error)}`,
          "  Fix: repair or replace the file, or remove the Image reference.",
        ].join("\n"),
      );
    }

    const plan = planDimensionEdits(source, imageNode, dimensions);

    if (plan === undefined) continue;

    edits.push(...plan.edits);
    changes.push(`${path}: ${plan.summary}`);
  }

  const updatedSource = edits.length === 0 ? undefined : applyJsonEdits(source, edits);

  // Validate the result rather than the input. A file whose Images carry a lone
  // `width` is invalid under the Standard but is exactly what this script
  // exists to repair, so refusing to run on it would strand the author. Nothing
  // is written until every file has been processed, so an invalid outcome
  // aborts the whole run instead of landing on disk.
  parseAndValidateQuiz(updatedSource ?? source, fileLabel);

  return { changes, fileLabel, filePath, updatedSource };
}

/**
 * Values that are present but wrong are replaced in place; missing ones are
 * inserted after whichever half is already there, or at the end of the Image
 * object. Each edit spans one value or one insertion point, so nothing between
 * the two fields is ever rewritten.
 */
function planDimensionEdits(
  source: string,
  imageNode: JsonNode,
  dimensions: { height: number; width: number },
) {
  const existing = {
    height: findMember(imageNode, "height"),
    width: findMember(imageNode, "width"),
  };
  const recorded = {
    height: readNumber(source, existing.height),
    width: readNumber(source, existing.width),
  };

  if (recorded.width === dimensions.width && recorded.height === dimensions.height) {
    return undefined;
  }

  const edits: SourceEdit[] = [];
  const additions: Array<{ key: string; value: string }> = [];

  for (const field of ["width", "height"] as const) {
    const member = existing[field];

    if (member === undefined) {
      additions.push({ key: field, value: String(dimensions[field]) });
      continue;
    }

    if (recorded[field] !== dimensions[field]) {
      edits.push({
        end: member.value.end,
        start: member.value.start,
        text: String(dimensions[field]),
      });
    }
  }

  if (additions.length > 0) {
    // Insert next to the half that already exists, so the pair stays together.
    const anchor = existing.height ?? existing.width ?? imageNode.members?.at(-1);

    if (anchor === undefined) {
      throw new Error("Cannot add dimensions to an empty Image object.");
    }

    edits.push(createMemberInsertion(source, imageNode, anchor, additions));
  }

  const summary =
    recorded.width === undefined && recorded.height === undefined
      ? `add ${dimensions.width}×${dimensions.height}`
      : `${recorded.width ?? "—"}×${recorded.height ?? "—"} → ${dimensions.width}×${dimensions.height}`;

  return { edits, summary };
}

function describeReadFailure(error: unknown) {
  if (error instanceof Error && "code" in error && error.code === "ENOENT") {
    return "The file does not exist.";
  }

  return error instanceof Error ? error.message : String(error);
}

function readNumber(source: string, member: JsonMember | undefined) {
  if (member === undefined) return undefined;

  const value = Number(source.slice(member.value.start, member.value.end));

  return Number.isFinite(value) ? value : undefined;
}

/** Every `questions[i].images[j]` object, with the path used in reports. */
function listImageNodes(root: JsonNode) {
  const questions = findMember(root, "questions")?.value.items ?? [];

  return questions.flatMap((question, questionIndex) =>
    (findMember(question, "images")?.value.items ?? []).map((imageNode, imageIndex) => ({
      imageNode,
      path: `questions[${questionIndex}].images[${imageIndex}]`,
    })),
  );
}
