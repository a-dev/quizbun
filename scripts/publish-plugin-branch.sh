#!/usr/bin/env bash
# Commit the assembled plugins/quizbun/ folder to a distribution branch.
# The branch root is the plugin root, so marketplaces can install it directly.
# Run `bun run plugin:package` first. Pushes only when content changed.
set -euo pipefail

BRANCH="${1:-plugin-dist}"
REMOTE="${2:-origin}"
PLUGIN_DIR="plugins/quizbun"
TREE="$(mktemp -d)/plugin-dist"
SOURCE_SHA="$(git rev-parse HEAD)"

if [[ ! -f "$PLUGIN_DIR/skills/create-quiz/scripts/validate-quiz.mjs" ]]; then
  echo "error: '$PLUGIN_DIR' is not assembled — run 'bun run plugin:package' first" >&2
  exit 1
fi

cleanup() { git worktree remove --force "$TREE" 2>/dev/null || true; }
trap cleanup EXIT

if git fetch --quiet --depth=1 "$REMOTE" "$BRANCH" 2>/dev/null; then
  git worktree add --quiet --detach "$TREE" FETCH_HEAD
else
  git worktree add --quiet --orphan -b "$BRANCH" "$TREE"
fi

# Replace the whole tree so files removed from the plugin disappear too.
find "$TREE" -mindepth 1 -maxdepth 1 ! -name .git -exec rm -rf {} +
cp -R "$PLUGIN_DIR"/. "$TREE"/
rm -f "$TREE/.DS_Store"

git -C "$TREE" add --all
if git -C "$TREE" diff --cached --quiet; then
  echo "Branch '$BRANCH' is already up to date."
  exit 0
fi

git -C "$TREE" \
  -c user.name="github-actions[bot]" \
  -c user.email="41898282+github-actions[bot]@users.noreply.github.com" \
  commit --quiet -m "build: assemble plugin from $SOURCE_SHA"
git -C "$TREE" push --quiet "$REMOTE" "HEAD:refs/heads/$BRANCH"
echo "Pushed plugin from $SOURCE_SHA to '$BRANCH'."
