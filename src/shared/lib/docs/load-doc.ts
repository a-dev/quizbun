import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import { renderDocMarkdown } from "./render-doc";

/**
 * Build-time-only module: reads the repo filesystem, so it may be imported
 * from Astro frontmatter and `getStaticPaths` — never from a client island.
 */

export interface LoadedDoc {
  /** The raw Markdown source, byte-for-byte as committed. */
  source: string;
  /** Sanitized HTML with site-rewritten links and heading ids. */
  html: string;
}

/**
 * Loads a repo Markdown file (e.g. `docs/standard.md`) and renders it for
 * the site. The repo file stays the single source of truth; an unresolvable
 * link inside it fails the build here.
 */
export function loadDoc(repoPath: string, base: string = import.meta.env.BASE_URL): LoadedDoc {
  const source = readFileSync(resolve(process.cwd(), repoPath), "utf8");

  return {
    source,
    html: renderDocMarkdown(source, { base, sourceRepoPath: repoPath }),
  };
}
