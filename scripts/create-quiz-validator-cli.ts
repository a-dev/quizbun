import { readFileSync } from "node:fs";

import {
  parseCliArguments,
  USAGE,
  validateStandardInput,
  validateTarget,
} from "./create-quiz-validator";
import { restoreNpmCallerWorkingDirectory } from "./create-quiz-validator-npm-alias";

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
