import { mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import type { BunPlugin } from "bun";

/** Builds the standalone `validate-quiz.mjs` bundle for the create-quiz skill. */
export async function buildCreateQuizValidator(options: { header: string }): Promise<string> {
  const workspaceRoot = process.cwd();
  const temporaryDirectory = mkdtempSync(join(tmpdir(), "create-quiz-validator-"));

  try {
    const build = await Bun.build({
      entrypoints: [resolve(workspaceRoot, "scripts/create-quiz-validator-cli.ts")],
      format: "esm",
      minify: false,
      naming: "validate-quiz.mjs",
      outdir: temporaryDirectory,
      plugins: [stubSyntaxHighlighterPlugin],
      sourcemap: "none",
      target: "node",
    });

    if (!build.success) {
      const messages = build.logs.map((log) => log.message).join("\n");
      throw new Error(`Could not build the standalone validator:\n${messages}`);
    }

    return [
      options.header,
      readFileSync(resolve(temporaryDirectory, "validate-quiz.mjs"), "utf8"),
    ].join("\n");
  } finally {
    rmSync(temporaryDirectory, { force: true, recursive: true });
  }
}

/**
 * The validator reaches the Markdown pipeline through the Public catalog
 * profile's sanitization audit, and that pipeline imports Prism plus seven
 * grammars for the site. Nothing the validator reports depends on syntax
 * highlighting: it asks whether a field renders to anything and whether raw
 * HTML survived, and highlighting only rewrites the inside of a `<pre><code>`
 * block that is non-empty either way.
 *
 * So the skill bundle ships without the highlighter (~57 KB). The stub has an
 * empty `languages` map, which lands `highlightPreCodeBlock` on the branch it
 * already takes for an unlisted fence — un-highlighted by design, not a new
 * code path. `create-quiz-skill-bundle.spec.ts` guards both halves of that.
 */
const stubSyntaxHighlighterPlugin: BunPlugin = {
  name: "stub-prismjs",
  setup(build) {
    build.onResolve({ filter: /^prismjs(\/.*)?$/ }, (args) => ({
      path: args.path,
      namespace: "stub-prismjs",
    }));

    build.onLoad({ filter: /.*/, namespace: "stub-prismjs" }, () => ({
      contents: "export default { highlight: (code) => code, languages: {} };",
      loader: "js",
    }));
  },
};
