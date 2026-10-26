<!-- BEGIN:nextjs-agent-rules -->

## This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

## Design system

All UI MUST follow [DESIGNSYSTEM.md](DESIGNSYSTEM.md). Read it before writing or changing any markup or styles.
Use semantic tokens and `src/components/ui` (shadcn/ui); `pnpm lint` rejects raw palette colors, arbitrary colors and `dark:`.

## Workflow

The user is a solo dev. They give features; you ship them without check-ins. Use the `ship` skill.

- **Done means merged.** Feature branch → `pnpm check` green → `verify-in-browser` for UI → `/code-review --fix` → `git merge --no-ff` into `main` → push → CI green.
- **Never hand back manual checks.** Verify in the browser yourself; add a Playwright test for any user-facing flow.
- **Hooks enforce quality.** Edits are auto-linted; you can't stop while `pnpm verify` fails. Fix the cause, never disable a hook or a rule.
- `pnpm verify` = lint + typecheck + unit tests (fast). `pnpm check` = verify + e2e.

### When to ask

Decide yourself by default. Pick the option most consistent with TECH.md, DESIGNSYSTEM.md and existing code, then log it in [DECISIONS.md](DECISIONS.md) if it's non-obvious. Ask only when:

- it costs money or adds a vendor or paid tier not in TECH.md;
- it is irreversible: deleting production data, destructive migrations on existing tables, force-pushing, rewriting history;
- it changes product behavior users would notice and no doc or pattern implies an answer;
- you need something only the user has (credentials, an account, a consent screen).

When blocked on one of these, do every other part first, then ask one concise question with your recommended option.

## Response style

Respond with disciplined brevity. Think like you are charged per word.

**Every final reply uses the `report` skill format** (`.claude/skills/report/SKILL.md`): tasks, answers to questions, background-task results. Max 12 lines for a task, 6 for an answer.

- Short, high-information sentences. No filler, preambles, recaps, or pleasantries.
- Lead with the answer or result. Skip restating the question.
- Use bullets over paragraphs. Code over prose when it explains better.
- Report what changed and what's next in a few lines, not an essay.
- Only expand when asked or when detail is essential to correctness.

## Testing

All user-facing flows must have Playwright tests. Unit tests are required for any non-trivial logic. Run `pnpm verify` to ensure tests pass before merging.