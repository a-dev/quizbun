#!/usr/bin/env bash
# Check the production artifact for legacy internal paths and canonical URLs.
set -euo pipefail

DIST_DIR="${1:-dist}"

if [[ ! -d "$DIST_DIR" ]]; then
  echo "error: '$DIST_DIR' not found — run 'bun run build' first" >&2
  exit 1
fi

if [[ ! -f "$DIST_DIR/manifest.webmanifest" || ! -f "$DIST_DIR/robots.txt" || ! -f "$DIST_DIR/sitemap-index.xml" ]]; then
  echo "error: required manifest, robots.txt, or sitemap is missing from '$DIST_DIR'" >&2
  exit 1
fi

if rg -n '"/quizbun/|url\(/quizbun/|https://a-dev\.github\.io/quizbun' "$DIST_DIR" -g '*.html' -g '*.xml' -g '*.txt' -g '*.webmanifest' -g '*.js' -g '*.css'; then
  echo "error: legacy /quizbun/ URL found in '$DIST_DIR'" >&2
  exit 1
fi

if ! rg -q 'https://quizbun\.fyi/sitemap-0\.xml' "$DIST_DIR/sitemap-index.xml" ||
   ! rg -q 'Sitemap: https://quizbun\.fyi/sitemap-index\.xml' "$DIST_DIR/robots.txt"; then
  echo "error: sitemap or robots.txt does not use the canonical domain" >&2
  exit 1
fi

if rg -n '<link rel="canonical" href="https?://(?!quizbun\.fyi/)|<meta property="og:url" content="https?://(?!quizbun\.fyi/)' "$DIST_DIR" -g '*.html' --pcre2; then
  echo "error: noncanonical page URL found in '$DIST_DIR'" >&2
  exit 1
fi

echo "OK: root-path artifact uses https://quizbun.fyi/"
