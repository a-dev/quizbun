import { readFileSync } from "node:fs";

import {
  parseCliArguments,
  USAGE,
  validateStandardInput,
  validateTarget,
} from "./create-quiz-validator";

try {
  const options = parseCliArguments(process.argv.slice(2));

  if (options.help) {
    console.log(USAGE);
    process.exit(0);
  }

  restoreNpmCallerWorkingDirectory();

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

/**
 * `npm run` executes a script from its package directory, so the bundled
 * `npm --prefix <skill> run validate -- quiz.json` alias would otherwise
 * resolve relative targets inside the skill instead of where the caller stood.
 * npm records that directory in INIT_CWD; restore it before any target is
 * resolved. Node invocations set neither variable and are left alone.
 */
function restoreNpmCallerWorkingDirectory(): void {
  const npmCallerDirectory = process.env.INIT_CWD;

  if (process.env.npm_package_name === "create-quiz-skill" && npmCallerDirectory !== undefined) {
    process.chdir(npmCallerDirectory);
  }
}
