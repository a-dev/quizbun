#!/usr/bin/env bash
# Base-path guard: after a GITHUB_PAGES=true build, no internal link in
# dist/ may be root-absolute outside the /quizbun base — such links 404 on
# GitHub Pages. Scans href/src/srcset/action attributes in built HTML and URL
# fields in the generated web app manifest.
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

MANIFEST_FILE="$DIST_DIR/manifest.webmanifest"

if [[ ! -f "$MANIFEST_FILE" ]]; then
  echo "error: '$MANIFEST_FILE' not found" >&2
  exit 1
fi

# Covers every URL-bearing field the manifest has today. Adding a field that
# carries a URL (`shortcuts[].url`, `file_handlers[].action`, …) means adding it
# to this alternation — a missed one is a silent blind spot, not a failure.
manifest_violations=$(grep -Eon '"(id|scope|start_url|src)"[[:space:]]*:[[:space:]]*"/[^"]*"' "$MANIFEST_FILE" |
  grep -Ev "\"$BASE_PATH(/|\")" |
  grep -Ev '"//' || true)

if [[ -n "$manifest_violations" ]]; then
  echo "Base-path regression: manifest URLs found outside '$BASE_PATH':" >&2
  echo "$manifest_violations" >&2
  exit 1
fi

echo "OK: no root-absolute internal URLs outside '$BASE_PATH' in $DIST_DIR HTML or manifest"
