#!/usr/bin/env bash
# PostToolUse(Edit|Write): auto-fix the edited file and report what eslint can't fix.
file=$(jq -r '.tool_input.file_path // empty')
case "$file" in
  "$CLAUDE_PROJECT_DIR"/src/*.ts | "$CLAUDE_PROJECT_DIR"/src/*.tsx | "$CLAUDE_PROJECT_DIR"/e2e/*.ts) ;;
  *) exit 0 ;;
esac
[ -f "$file" ] || exit 0
cd "$CLAUDE_PROJECT_DIR" || exit 0
if ! out=$(pnpm exec eslint --fix "$file" 2>&1); then
  echo "$out" >&2
  exit 2
fi
