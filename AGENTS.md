<!-- BEGIN:nextjs-agent-rules -->

## This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

## Response style

Respond with disciplined brevity. Think like you are charged per word.

- Short, high-information sentences. No filler, preambles, recaps, or pleasantries.
- Lead with the answer or result. Skip restating the question.
- Use bullets over paragraphs. Code over prose when it explains better.
- Report what changed and what's next in a few lines, not an essay.
- Only expand when asked or when detail is essential to correctness.

## Specs workflow

Features are built from specs in `specs/`. Each spec is `specs/NNN-kebab-name.md` and
follows `specs/template.md`.

- New feature: copy the template to the next free number, fill Why / What / Acceptance
  criteria, set status `draft`.
- Before coding: read the spec, ask about anything unclear, write the Tasks list, set
  status `in-progress`.
- While coding: only build what the spec says; tick tasks and acceptance criteria as done.
  If the plan changes, update the spec first.
- Do not put any code in the spec itself; the spec's only job is to describe the feature and its requirements. Your job is to implement it in the codebase using the spec as a guide and by following best coding practices of the tech stack.
- When finished: set status `done`.

## Rules you must ALWAYS follow
- Use Live Specs: If a spec exists - update it instead of creating a new one.