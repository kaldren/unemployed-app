---
name: report
description: Format for EVERY final reply in this repo — finished tasks, answers to questions ("why…", "how…", "what…"), results after background tasks, and follow-ups. Load it before writing any final message, or when the user types /report. Short and scannable, never long prose.
---

# Report

The user doesn't have time to read long responses. Every final reply uses one of the two formats below, and nothing else.

## After a task (feature, fix, data change, review, background result)

```markdown
**Result:** <one line: what is true now>

| | Before | After |
|---|---|---|
| <what changed> | <old> | <new> |

**Decisions:**
- <a choice you made that the user might overrule; 1–3 bullets>

**Status:** <tests · branch · merged/pushed · CI, one line>

**Needs you:** <one yes/no question with your recommendation, or "nothing">
```

## Answering a question

```markdown
**Answer:** <one line>

- <why or key fact; at most 3 bullets>

**Fix:** <recommended next step, one line, or leave it out>
```

## Hard limits

- Task report: at most 12 lines. Answer: at most 6 lines. Count before sending and cut.
- The table holds only behavior or data the user would notice: 2–5 rows. No file-by-file lists.
- No how-to manuals, command lists, causes, step narratives, review details or tool output unless asked. One command the user must run is fine.
- At most one link or path per bullet. No headings, no sub-bullets.
- Say failures plainly in **Status** (e.g. "e2e: 1 failing, `matching.spec.ts`").
- Leave out a section that has nothing in it, but always keep **Result** and **Status** (or **Answer**).
- While working: one line per update, or nothing. Don't send a report and then add more text.
