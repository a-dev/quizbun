import { Glob } from "bun";
import { transformSync } from "oxc-transform-react";

/**
 * React Compiler gate. When the compiler cannot handle a component or hook it
 * skips it silently: the build still passes, and that code ships without
 * auto-memoization. This compiles every shipped source file with the default
 * options the build uses (`compiler: true`) and fails on any diagnostic, so a
 * skip is caught when it is introduced instead of being found later in a
 * profile.
 *
 *   bun run react-compiler:check
 */

const SOURCES = "src/**/*.{ts,tsx}";
// Tests and stories are compiled too, but never shipped.
const NOT_SHIPPED = /\.(spec|test|stories)\.tsx?$|\.d\.ts$/;

const findings: string[] = [];
let checked = 0;

for (const path of [...new Glob(SOURCES).scanSync(".")].sort()) {
  if (NOT_SHIPPED.test(path)) continue;

  const source = await Bun.file(path).text();
  const { errors } = transformSync(path, source, {
    lang: path.endsWith(".tsx") ? "tsx" : "ts",
    jsx: "preserve",
    reactCompiler: { reportDiagnostics: true },
  });

  checked += 1;

  for (const error of errors) {
    const offset = error.labels[0]?.start ?? 0;
    const line = source.slice(0, offset).split("\n").length;
    const help = error.helpMessage ? `\n    help: ${error.helpMessage}` : "";

    findings.push(`${path}:${line}  ${error.message.split("\n")[0]}${help}`);
  }
}

if (findings.length > 0) {
  console.error(`React Compiler skipped or rejected code in ${findings.length} place(s):\n`);
  console.error(findings.map((finding) => `  ${finding}`).join("\n"));
  console.error(
    "\nRewrite the code so the compiler accepts it (see the help lines above). Add a" +
      ' `"use no memo"` directive only when a rewrite is not possible, with a comment explaining why.',
  );
  process.exit(1);
}

console.log(`React Compiler accepts all ${checked} shipped source files.`);
