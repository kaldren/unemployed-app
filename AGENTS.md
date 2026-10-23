<!-- BEGIN:nextjs-agent-rules -->

## This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

## Design system

All UI MUST follow [DESIGN.md](DESIGN.md). Read it before writing or changing any markup or styles.
Use semantic tokens and `src/components/ui` (shadcn/ui); `pnpm lint` rejects raw palette colors, arbitrary colors and `dark:`.

## Response style

Respond with disciplined brevity. Think like you are charged per word.

- Short, high-information sentences. No filler, preambles, recaps, or pleasantries.
- Lead with the answer or result. Skip restating the question.
- Use bullets over paragraphs. Code over prose when it explains better.
- Report what changed and what's next in a few lines, not an essay.
- Only expand when asked or when detail is essential to correctness.
