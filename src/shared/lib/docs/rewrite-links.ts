import { existsSync } from "node:fs";
import { posix } from "node:path";
import { resolve } from "node:path";

/**
 * Rewrites repo-relative Markdown links to their site equivalents (T1.1).
 * The repo files in `docs/` stay the single source of truth: they link to
 * each other with relative paths that work on GitHub, and this module maps
 * those targets to site routes at build time. A link that resolves to
 * neither a site page nor an existing repo file is a build error.
 */

export const GITHUB_REPO_URL = "https://github.com/a-dev/quizbun";
export const SITE_URL = "https://a-dev.github.io/quizbun/";

/** Repo Markdown files that have a site page rendered from them. */
export const DOC_SITE_PAGES: Readonly<Record<string, string>> = {
  "docs/contributing.md": "docs/contributing/",
  "docs/examples/README.md": "docs/examples/",
  "docs/quiz-generation-prompt.md": "docs/prompt/",
  "docs/standard.md": "docs/standard/",
};

/** Canonical example files are emitted as downloadable site files (T3.3). */
const DOC_EXAMPLE_JSON_PATTERN = /^docs\/examples\/[a-z0-9-]+\.json$/;

/** The committed JSON Schema artifact is published at `/schema/quiz.v1.json`. */
const SCHEMA_ARTIFACT_REPO_PATH = "public/schema/quiz.v1.json";

export interface DocLinkContext {
  /** Repo path of the Markdown file being rendered, e.g. `docs/standard.md`. */
  sourceRepoPath: string;
  /** The Astro base path (`import.meta.env.BASE_URL`). */
  base: string;
  /** Injectable for tests; defaults to checking the real repo. */
  fileExists?: (repoPath: string) => boolean;
}

export function resolveDocLink(target: string, context: DocLinkContext): string {
  const trimmedTarget = target.trim();

  // Fragment-only, mailto, and non-site absolute links pass through.
  if (trimmedTarget.startsWith("#") || trimmedTarget.startsWith("mailto:")) {
    return trimmedTarget;
  }

  // Absolute links to the live site become base-relative so they work on
  // previews and on the live deploy alike.
  if (trimmedTarget.startsWith(SITE_URL)) {
    return joinBase(context.base, trimmedTarget.slice(SITE_URL.length));
  }

  if (/^https?:\/\//i.test(trimmedTarget)) {
    return trimmedTarget;
  }

  const [path, fragment] = splitFragment(trimmedTarget);
  const repoPath = resolveRepoPath(path, context);

  const sitePage = DOC_SITE_PAGES[repoPath];
  if (sitePage !== undefined) {
    return joinBase(context.base, sitePage) + fragment;
  }

  if (repoPath === SCHEMA_ARTIFACT_REPO_PATH) {
    return joinBase(context.base, "schema/quiz.v1.json");
  }

  if (DOC_EXAMPLE_JSON_PATTERN.test(repoPath)) {
    return joinBase(context.base, repoPath);
  }

  const fileExists = context.fileExists ?? defaultFileExists;
  if (fileExists(repoPath)) {
    return `${GITHUB_REPO_URL}/blob/main/${repoPath}${fragment}`;
  }

  throw new Error(
    `Docs link in ${context.sourceRepoPath} resolves to neither a site page nor a repo file: "${trimmedTarget}" (resolved to "${repoPath}").`,
  );
}

function resolveRepoPath(relativeTarget: string, context: DocLinkContext): string {
  const sourceDir = posix.dirname(context.sourceRepoPath);
  const repoPath = posix.normalize(posix.join(sourceDir, relativeTarget));

  if (repoPath.startsWith("..")) {
    throw new Error(
      `Docs link in ${context.sourceRepoPath} escapes the repository root: "${relativeTarget}".`,
    );
  }

  return repoPath;
}

function splitFragment(target: string): [path: string, fragment: string] {
  const fragmentIndex = target.indexOf("#");

  if (fragmentIndex === -1) {
    return [target, ""];
  }

  return [target.slice(0, fragmentIndex), target.slice(fragmentIndex)];
}

function joinBase(base: string, path: string): string {
  const normalizedBase = base.endsWith("/") ? base : `${base}/`;

  return `${normalizedBase}${path.replace(/^\//, "")}`;
}

function defaultFileExists(repoPath: string): boolean {
  return existsSync(resolve(process.cwd(), repoPath));
}
