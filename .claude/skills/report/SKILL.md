---
name: report
description: End a task with one short, scannable report instead of long prose. Use at the end of every task (features, fixes, data changes, reviews, background-task results), or when the user types /report.
---

# Report

The user doesn't have time to read long responses. Finish every task with **one** report in this format, and nothing else:

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

## Rules

- At most ~12 lines. Every word must earn its place.
- The table holds only behavior or data the user would notice: 2–5 rows. No file-by-file lists.
- Leave out how you got there: causes, steps, review narratives and tool output. Give those only when asked.
- Say failures plainly in **Status** (e.g. "e2e: 1 failing, `matching.spec.ts`").
- Leave out a section that has nothing in it, but always keep **Result** and **Status**.
- While working: one line per update, or nothing. Don't send a report and then add more text.
