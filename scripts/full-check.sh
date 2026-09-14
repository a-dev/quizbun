#!/usr/bin/env bash
# Full check: everything CI runs, plus the optional local-only analysers
# (knip, jscpd, mutation testing) that never gate CI.
#
# Steps run in CI order, each one reported as PASS/FAIL, and the run keeps
# going after a failure so one command doesn't hide the rest — the summary at
# the end lists every failure and the exit code is non-zero if any step failed.
# Use --bail to stop at the first failure instead.
#
# Usage:
#   bun run full-check                 # CI steps + optional analysers
#   bun run full-check -- --ci         # CI steps only
#   bun run full-check -- --extras     # optional analysers only
#   bun run full-check -- --skip mutate --skip e2e
#   bun run full-check -- --bail
#   bun run full-check -- --list
set -uo pipefail

cd "$(dirname "${BASH_SOURCE[0]}")/.."

# Step table: "id<TAB>group<TAB>description<TAB>command".
# group: ci = mirrors .github/workflows/ci.yml, extra = optional, never in CI.
STEPS=(
  "css:dts	ci	Generate CSS Modules typings	bun run css:dts"
  "astro:sync	ci	Generate Astro types	bun run astro sync"
  "typecheck	ci	Typecheck	bun run typecheck"
  "check:astro	ci	Astro check	bun run check:astro"
  "test	ci	Unit and component tests	bun run test"
  "check	ci	Lint and format	bun run check"
  "stylelint	ci	CSS lint	bun run stylelint"
  "validate:docs-examples	ci	Validate docs examples	bun run validate:docs-examples"
  "validate:public-quizzes	ci	Validate public quizzes	bun run validate:public-quizzes"
  "quiz:sizes:check	ci	Check Quiz Image dimensions	bun run quiz:sizes:check"
  "schema:check	ci	Check JSON Schema drift	bun run schema:check"
  "skill:create-quiz:check	ci	Check create-quiz skill drift	bun run skill:create-quiz:check"
  "build	ci	Build static site (GITHUB_PAGES=true)	GITHUB_PAGES=true bun run build"
  "dist:base-paths	ci	Check dist for base-path regressions	bash scripts/check-dist-base-paths.sh"
  "e2e	ci	E2E tests	bun run e2e"
  "knip	extra	Unused files, exports and dependencies	bun run knip"
  "jscpd	extra	Copy-paste detection	bun run jscpd"
  "mutate	extra	Mutation testing	bun run mutate"
)

groups="all"
bail=false
skip=()

while [[ $# -gt 0 ]]; do
  case "$1" in
    --ci) groups="ci"; shift ;;
    --extras) groups="extra"; shift ;;
    --bail) bail=true; shift ;;
    --skip)
      [[ $# -ge 2 ]] || { echo "error: --skip needs a step id" >&2; exit 2; }
      skip+=("$2"); shift 2 ;;
    --skip=*) skip+=("${1#--skip=}"); shift ;;
    --list)
      printf '%-26s %-6s %s\n' "STEP" "GROUP" "DESCRIPTION"
      for step in "${STEPS[@]}"; do
        IFS=$'\t' read -r id group desc _cmd <<<"$step"
        printf '%-26s %-6s %s\n' "$id" "$group" "$desc"
      done
      exit 0 ;;
    -h|--help) sed -n '2,16p' "${BASH_SOURCE[0]}" | sed 's/^# \{0,1\}//'; exit 0 ;;
    *) echo "error: unknown option '$1' (try --help)" >&2; exit 2 ;;
  esac
done

is_skipped() {
  local id="$1" s
  for s in "${skip[@]+"${skip[@]}"}"; do
    [[ "$s" == "$id" ]] && return 0
  done
  return 1
}

passed=()
failed=()
skipped=()
started=$SECONDS

for step in "${STEPS[@]}"; do
  IFS=$'\t' read -r id group desc cmd <<<"$step"

  if [[ "$groups" != "all" && "$groups" != "$group" ]]; then
    continue
  fi

  if is_skipped "$id"; then
    skipped+=("$id")
    echo "── skip  $id — $desc"
    continue
  fi

  # The base-path guard only means anything against a fresh GITHUB_PAGES
  # build, so it goes with the build step — a stale dist/ would report
  # failures that say nothing about the current tree.
  if [[ "$id" == "dist:base-paths" ]] && [[ " ${passed[*]+"${passed[*]}"} " != *" build "* ]]; then
    skipped+=("$id")
    echo "── skip  $id — build did not run, dist/ may be stale"
    continue
  fi

  echo ""
  echo "── run   $id — $desc"
  step_started=$SECONDS

  if eval "$cmd"; then
    passed+=("$id")
    echo "── pass  $id ($((SECONDS - step_started))s)"
  else
    failed+=("$id")
    echo "── FAIL  $id ($((SECONDS - step_started))s)" >&2
    if [[ "$bail" == true ]]; then
      break
    fi
  fi
done

echo ""
echo "──────────────────────────────────────────"
echo "full-check finished in $((SECONDS - started))s"
echo "  passed:  ${#passed[@]}"
echo "  skipped: ${#skipped[@]}${skipped[*]+" (${skipped[*]})"}"
echo "  failed:  ${#failed[@]}${failed[*]+" (${failed[*]})"}"

if [[ ${#failed[@]} -gt 0 ]]; then
  exit 1
fi
