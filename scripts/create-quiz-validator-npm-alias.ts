/**
 * `npm run` executes a script from its package directory, so the bundled
 * `npm --prefix <skill> run validate -- quiz.json` alias would otherwise
 * resolve relative targets inside the skill instead of where the caller stood.
 * npm records that directory in INIT_CWD; restore it before any target is
 * resolved. Node invocations set neither variable and are left alone.
 *
 * The Quizbun plugin build stubs this module out: the plugin ships no npm
 * alias, and the Claude plugin directory holds any environment read for review.
 */
export function restoreNpmCallerWorkingDirectory(): void {
  const npmCallerDirectory = process.env.INIT_CWD;

  if (process.env.npm_package_name === "create-quiz-skill" && npmCallerDirectory !== undefined) {
    process.chdir(npmCallerDirectory);
  }
}
