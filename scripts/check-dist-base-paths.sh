#!/usr/bin/env bash
# Base-path guard: after a GITHUB_PAGES=true build, no internal link in
# dist/ may be root-absolute outside the /quizbun base — such links 404 on
# GitHub Pages. Scans href/src/srcset/action attributes in built HTML.
set -euo pipefail

DIST_DIR="${1:-dist}"
BASE_PATH="/quizbun"

if [[ ! -d "$DIST_DIR" ]]; then
  echo "error: '$DIST_DIR' not found — run 'GITHUB_PAGES=true bun run build' first" >&2
  exit 1
fi

# Root-absolute URLs ("/...") that don't start with the base path and aren't
# protocol-relative ("//...").
violations=$(grep -rEon "(href|src|srcset|action)=\"/[^\"]*\"" "$DIST_DIR" --include='*.html' |
  grep -Ev "=\"$BASE_PATH(/|\")" |
  grep -Ev "=\"//" || true)

if [[ -n "$violations" ]]; then
  echo "Base-path regression: root-absolute internal URLs found outside '$BASE_PATH':" >&2
  echo "$violations" >&2
  exit 1
fi

echo "OK: no root-absolute internal URLs outside '$BASE_PATH' in $DIST_DIR"
