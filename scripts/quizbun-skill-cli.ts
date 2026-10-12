import { spawnSync } from "node:child_process";
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import { checkImportQuestionCount, checkImportSize } from "../src/shared/lib/quiz/import-limits";
import {
  encodeQuizLink,
  MAX_QUIZ_LINK_LENGTH,
  QUIZ_LINK_PARAM,
} from "../src/shared/lib/quiz-link/quiz-link";

/**
 * The CLI bundled into the `quizbun` skill. It checks a Quiz with the sibling
 * `create-quiz` validator, applies the Import limits, and writes a launcher
 * HTML file that opens the Quiz on Quizbun's Import page. The link itself is
 * never printed unless `--print-url` asks for it.
 */

const EXIT_INVALID_QUIZ = 1;
const EXIT_OVER_LIMITS = 2;
const EXIT_MISSING_CREATE_QUIZ = 3;

const DEFAULT_BASE = "https://quizbun.fyi/";

const USAGE = `Usage:
  open-quiz <quiz.json> [--out <dir>] [--base <url>] [--print-url]

Options:
  --out <dir>    Directory for the launcher file (default: next to the Quiz file)
  --base <url>   Quizbun site address (default: ${DEFAULT_BASE})
  --print-url    Print the raw link. For scripts only; never paste it into a chat.
  -h, --help     Show this help

Exit codes:
  0  The launcher file was written
  1  The Quiz is invalid; the create-quiz validator's report is printed
  2  The Quiz is over Quizbun's Import limits or the link limit
  3  The create-quiz skill is missing`;

interface OpenQuizOptions {
  base: string;
  help: boolean;
  out?: string;
  printUrl: boolean;
  target?: string;
}

function parseOpenQuizArguments(args: string[]): OpenQuizOptions {
  const options: OpenQuizOptions = { base: DEFAULT_BASE, help: false, printUrl: false };

  for (let index = 0; index < args.length; index += 1) {
    const arg = args[index] ?? "";

    if (arg === "-h" || arg === "--help") options.help = true;
    else if (arg === "--print-url") options.printUrl = true;
    else if (arg === "--out" || arg === "--base") {
      const value = args[index + 1];

      if (value === undefined) throw new Error(`${arg} needs a value.\n\n${USAGE}`);
      if (arg === "--out") options.out = value;
      else options.base = value;
      index += 1;
    } else if (arg.startsWith("-")) {
      throw new Error(`Unknown option ${arg}.\n\n${USAGE}`);
    } else if (options.target === undefined) {
      options.target = arg;
    } else {
      throw new Error(`Expected one Quiz file, got more than one.\n\n${USAGE}`);
    }
  }

  return options;
}

function buildQuizUrl(base: string, payload: string): string {
  const root = base.endsWith("/") ? base : `${base}/`;

  return `${root}import/#${QUIZ_LINK_PARAM}=${payload}`;
}

function escapeHtml(text: string): string {
  return text
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function buildLauncherHtml(title: string, url: string): string {
  const safeTitle = escapeHtml(title);
  // `JSON.stringify` makes a valid script string; `<` is escaped so no value
  // can close the script element.
  const scriptUrl = JSON.stringify(url).replaceAll("<", "\\u003c");

  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${safeTitle}</title>
</head>
<body>
<p>Opening <strong>${safeTitle}</strong> in Quizbun.</p>
<p><a href="${escapeHtml(url)}">Open the Quiz in Quizbun</a> if nothing happens.</p>
<noscript><p>JavaScript is off. Use the link above.</p></noscript>
<script>location.replace(${scriptUrl});</script>
</body>
</html>
`;
}

async function main(): Promise<void> {
  const options = parseOpenQuizArguments(process.argv.slice(2));

  if (options.help) {
    console.log(USAGE);
    return;
  }

  if (options.target === undefined) throw new Error(`Missing the Quiz file.\n\n${USAGE}`);

  const quizPath = resolve(options.target);
  const validatorPath = resolve(
    dirname(fileURLToPath(import.meta.url)),
    "../../create-quiz/scripts/validate-quiz.mjs",
  );

  if (!existsSync(validatorPath)) {
    console.error(
      "The quizbun skill needs the create-quiz skill. Install it with `npx skills add a-dev/quizbun --skill create-quiz`.",
    );
    process.exitCode = EXIT_MISSING_CREATE_QUIZ;
    return;
  }

  const validation = spawnSync(process.execPath, [validatorPath, quizPath], { encoding: "utf8" });

  if (validation.status !== 0) {
    process.stdout.write(validation.stdout);
    process.stderr.write(validation.stderr);
    process.exitCode = validation.status ?? EXIT_INVALID_QUIZ;
    return;
  }

  const text = readFileSync(quizPath, "utf8");
  const quiz: unknown = JSON.parse(text);
  const limitReport = checkImportSize(text) ?? checkImportQuestionCount(quiz);

  if (limitReport !== undefined) {
    console.error(limitReport);
    process.exitCode = EXIT_OVER_LIMITS;
    return;
  }

  const payload = await encodeQuizLink(JSON.stringify(quiz));

  if (payload.length > MAX_QUIZ_LINK_LENGTH) {
    console.error(
      `The link would be ${payload.length} characters; browsers open links up to ${MAX_QUIZ_LINK_LENGTH}. Import the \`.json\` file instead.`,
    );
    process.exitCode = EXIT_OVER_LIMITS;
    return;
  }

  const { id, title } = quiz as { id: string; title: string };
  const url = buildQuizUrl(options.base, payload);
  const launcherPath = join(resolve(options.out ?? dirname(quizPath)), `${id}.open.html`);

  writeFileSync(launcherPath, buildLauncherHtml(title, url));
  console.log(`Wrote ${launcherPath}`);

  if (options.printUrl) console.log(url);
}

try {
  await main();
} catch (error) {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = EXIT_INVALID_QUIZ;
}
