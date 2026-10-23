#!/usr/bin/env bash
# Stop: don't let Claude finish with broken code. Runs only when source files changed.
input=$(cat)
# Already blocked once this turn: let it stop so a real blocker can be reported.
[ "$(jq -r '.stop_hook_active' <<<"$input")" = "true" ] && exit 0
cd "$CLAUDE_PROJECT_DIR" || exit 0
changed=$( { git diff --name-only HEAD; git ls-files --others --exclude-standard; } 2>/dev/null \
  | grep -E '\.(ts|tsx|mts|mjs|css)$|^package\.json$' )
[ -z "$changed" ] && exit 0
if ! out=$(pnpm verify 2>&1); then
  echo "pnpm verify failed. Fix it before finishing:" >&2
  tail -40 <<<"$out" >&2
  exit 2
fi
