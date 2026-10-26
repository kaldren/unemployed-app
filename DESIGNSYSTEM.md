# Design system

How every screen looks, moves and feels. **Every agent and every UI change must follow this page.**
`pnpm lint` enforces the color rules, so a violation fails CI. Read it before touching markup or styles.

## Personality: bright, rewarding, on your side

Job hunting is draining. The app should be the bright spot people want to open every morning.

- **Vibrant.** Lavender-white pages, white cards, one electric violet, and the *spark* gradient
  (violet → pink → amber) for moments that matter.
- **Rewarding.** Every action gets feedback: progress fills, streaks grow, matches celebrate.
- **Calm underneath.** Lots of space, soft shadows, plain words. Color marks progress and the next
  action, never noise.
- **Human.** Short sentences, sentence case ("Save changes", not "SUBMIT"). Talk like a friend who's
  rooting for you.
- **One primary action per view.** Everything else is outline, ghost or a link.
- **Less, but better.** Remove before adding: no labels that repeat what's on screen, no decorative
  dividers. If a page has one job, it has no card.

## The daily loop

Engagement comes from real progress, not tricks. Every signed-in home screen should answer three
questions at a glance:

1. **What's new?** A greeting and fresh items ("Jobs for you").
2. **How far am I?** A visible, finite goal: `DailyProgress` ("2 reviewed · 3 to go today").
3. **Why come back?** A streak (`StreakBadge`) and a promise of what's next ("New matches land every
   morning").

| Moment | Feedback |
|---|---|
| Any swipe | Card flies out, progress bar fills (`Progress`, spark gradient) |
| First swipe of the day | Streak badge grows by one and pops (`animate-pop`) |
| Deck finished | "All caught up for today" + 100% bar + what arrives tomorrow |
| Mutual match | `MatchCelebration`: spark-gradient card, confetti, one clear next step |

Components live in `src/components/engagement.tsx`; logic (streak, progress) in
`src/lib/engagement/streak.ts`, with unit tests. Reuse them for any new daily surface (e.g. employers).

### Ethics (must)

Our users are often stressed and vulnerable. Habit-forming, never manipulative:

- **Finite, honest goals.** Decks end. Never an infinite feed, never fake counts or fake scarcity
  ("Only 2 left!", countdown timers).
- **No guilt.** A broken streak just disappears; never "You lost your streak" or sad mascots.
  Streak copy only encourages.
- **Celebrate real outcomes** (a match, a finished deck), not busywork.
- **Respectful notifications.** One daily digest at most, only when there's something new, always
  with an off switch.
- **Motion is optional.** Everything animated respects `prefers-reduced-motion` (built into
  `animate-confetti`, `animate-pop`, `Progress`). Never convey information by motion alone.

## Tokens

Defined once in `src/app/globals.css` (`:root`, exposed to Tailwind via `@theme inline`).
Use them as Tailwind classes: `bg-primary`, `text-muted-foreground`, `from-spark-1`, `ring-ring`…

| Token | Value | Use for |
|---|---|---|
| `background` | `#FBF8FF` | Page background (set on `body`; don't repeat it) |
| `foreground` | `#1A1530` | Body text (default; don't repeat it) |
| `card` | `#FFFFFF` | Cards, inputs, popovers |
| `primary` / `primary-foreground` | `#6D28D9` / white | The main action, active nav item, links, small accent text |
| `primary-hover` | `#5B21B6` | Hover for primary (built into `Button`) |
| `brand` | `#8B5CF6` | Non-text accents: rings, highlights, illustrations |
| `spark-1` → `spark-2` → `spark-3` | `#7C3AED` → `#DB2777` → `#F59E0B` | The spark gradient. Text may sit on `spark-1`→`spark-2` only; `spark-3` is decoration |
| `streak` / `streak-soft` / `streak-foreground` | `#EA580C` / `#FFEDD5` / `#9A3412` | Flame icon / streak chip fill / its text |
| `success-soft` / `success-soft-foreground` | `#D1FAE5` / `#065F46` | "Great fit" chips (e.g. "90% skills match") |
| `secondary` / `secondary-foreground` | `#F3EFFC` / ink | Secondary buttons, tags |
| `muted` / `muted-foreground` | `#F3EFFC` / `#665D7A` | Subtle fills / hints, meta text, placeholders |
| `accent` / `accent-foreground` | `#EDE7FE` / ink | Hover, selected, "Why it fits" panels, icon circles |
| `destructive` | `#B42318` | Errors, "Remove" |
| `success` | `#047857` | "Saved", completed states |
| `warning` | `#B45309` | Needs attention, unsaved changes |
| `border` / `input` | `#E9E3F5` / `#DCD3EE` | Hairlines / form control borders |
| `ring` | `#8B5CF6` | Focus rings (`focus-visible:ring-3 ring-ring/50`) |
| `radius` | `0.75rem` | Controls `rounded-lg`, cards `rounded-2xl`, buttons, chips, tags `rounded-full` |

Light only for the MVP. Dark mode will be added by redefining the same tokens, so app code never
needs `dark:` classes. New color need? Add a token here and in `globals.css`, check contrast, then use it.

### The spark gradient

The brand's signature. Use it **sparingly** so it stays special:

| Use | Classes |
|---|---|
| Hero / celebratory action (`Button variant="spark"`) | Like, landing "Find a job" |
| Logo mark | `Brand` (`@/components/brand`) |
| A few headline words | `SparkText` (`@/components/brand`) |
| Progress fill | `Progress` (built in) |
| Top strip of a deck card | `h-1.5 bg-linear-to-r from-spark-1 via-spark-2 to-spark-3` |
| Match celebration / avatar initials | `bg-linear-to-br from-spark-1 to-spark-2 text-primary-foreground` |

Never as a page background, on body text, or more than one large gradient surface per view.

### Type

Geist (`font-sans`, set on `html`). Use `font-mono` only for code or IDs.

| Role | Classes |
|---|---|
| Greeting / eyebrow | `text-sm font-medium text-primary` ("Good morning, Ana") |
| Page title (`h1`) | `text-4xl font-semibold tracking-tight` |
| Section / card title (`h2`) | `CardTitle` (`text-lg font-semibold`); deck cards `text-2xl tracking-tight` |
| Body | `text-sm` (forms, cards), `text-base` (short intros) |
| Hint / meta | `text-xs text-muted-foreground` or `text-sm text-muted-foreground` |
| Label | `Label` (`text-sm font-medium`) |

### Space, depth and motion

- Signed-in pages start with `AppHeader` (`@/components/app-header`): `Brand` → home, Matches,
  Profile, Sign out. Active item: `bg-accent text-primary`. Never add a page-level "Home" or "Back" link.
- Page shell: `px-4 pt-6 pb-16`, content `max-w-5xl` (editors), `max-w-xl` (decks), `max-w-sm`
  (single-focus pages). No horizontal scroll at 390px.
- Stacks: `gap-6` between blocks, `gap-4`/`gap-5` between fields, `gap-1.5` label → control.
- Surfaces: `Card` (`rounded-2xl`, `shadow-sm`, `ring-1 ring-border`). Only `shadow-sm`.
- Motion: 200ms for UI transitions, `animate-pop` for rewards, `Confetti` only for a mutual match.
  Add `motion-reduce:transition-none` to any new transition.

## Components

Use `src/components/ui/*` (shadcn/ui, Radix base). Import from `@/components/ui/<name>`.

| Need | Use |
|---|---|
| Any button or button-styled link | `Button` (`variant`: default, spark, outline, secondary, ghost, destructive, link; `size`: sm, default, lg, icon…). Links: `<Button asChild><Link …/></Button>` |
| Text field | `Input`, `Textarea` |
| Dropdown | `NativeSelect` + `NativeSelectOption` |
| Checkbox | `Checkbox` + `Label htmlFor` |
| Progress toward a goal | `Progress` (spark fill; give it an `aria-label`) |
| Surface / section | `Card`, `CardHeader`, `CardTitle`, `CardDescription`, `CardContent`, `CardFooter` |
| Tag, chip, count | `Badge` (`secondary` for tags; `bg-success-soft text-success-soft-foreground` for fit) |
| Page-level message | `Alert` (`variant="destructive"` for errors; it sets `role="alert"`) |
| Logo / gradient words | `Brand`, `SparkText` (`@/components/brand`) |
| Streak, today's progress, match moment | `StreakBadge`, `DailyProgress`, `MatchCelebration`, `Confetti` (`@/components/engagement`) |
| Swipe deck | `SwipeDeck` (`@/components/swipe-deck`), pass `daily` to show progress and streak |
| Class merging | `cn()` from `@/lib/utils` |

Forms build on `src/components/form.tsx` (`SectionForm`, `Field`, `TextInput`, `Select`,
`TagInput`, `ListEditor`…). Reuse them for any new form.

**Missing a component?** Add it with `pnpm dlx shadcn@latest add <name>`, then align it with the
tokens (pill buttons, `h-10` controls, `bg-card` inputs). Don't hand-roll a lookalike.

## Rules

**Must**

- Style with semantic tokens and `src/components/ui` only.
- Keep one primary button per view: `variant="default"` or `variant="spark"`, not both.
- Give every control a visible `Label` (or `aria-label` when context makes it obvious).
- Give every action visible feedback within 100ms (state change, progress, or "Saving…").
- Show errors next to the field (`text-sm text-destructive`) and page errors in an `Alert`.
- Show progress in words on the button: "Saving…", "Reading your resume…".
- Disable submit buttons until there is something to send.
- End every empty state on a positive next step: what's coming and one outline button.
- Keep focus visible. Never remove `outline`/`ring` without a replacement.
- Meet WCAG AA: text 4.5:1, UI shapes 3:1. The tokens pass; check any new pairing.
- Mark decorative icons and effects `aria-hidden`; announce celebrations with `role="status"`.

**Must not** (lint fails)

- Raw Tailwind palette colors in app code: `text-zinc-600`, `bg-white`, `from-violet-500`…
- Arbitrary colors: `bg-[#fff]`, `text-[rgb(…)]`.
- `dark:` variants.

**Must not** (review)

- Inline `style` colors, new one-off button or input class strings, `shadow-md`+.
- Spark gradient or `primary` as a large background (the match celebration is the one exception).
- Guilt, fake urgency or fake scarcity in copy (see [Ethics](#ethics-must)).
- Raw `<button>`, `<input>`, `<select>` in pages when a component exists.

## Patterns

**Daily home** (candidate `/`): greeting → `h1` → one-line intro → `DailyProgress` → deck →
caught-up state.

```tsx
<p className="text-sm font-medium text-primary">Good morning, {firstName}</p>
<h1 className="text-4xl font-semibold tracking-tight">Jobs for you</h1>
<SwipeDeck cards={…} onSwipe={…} daily={{ streak, swipedToday }} empty={<CaughtUp />} />
```

**Caught up / empty state**: a card with an icon in a `bg-accent text-primary` circle, a
`text-lg font-semibold` promise ("New matches land every morning"), one muted sentence, and an
outline button.

**Single-focus page** (sign in, welcome): no card, centered `SparkText` title, one action.

```tsx
<main className="flex flex-1 items-center justify-center px-4 pb-16">
  <div className="flex w-full max-w-sm flex-col gap-10 text-center">
    <h1 className="text-4xl font-semibold tracking-tight"><SparkText>…</SparkText></h1>
    <Button size="lg">…</Button>
  </div>
</main>
```

**List item with an identity** (matches): spark-gradient circle with the initial, title and meta,
outline action on the right.

**Section navigation**: plain text items, selected `bg-accent` (desktop) / `bg-primary` pill (mobile).
Status is a green check (done) or a `bg-brand` dot (needed); optional items show nothing.

**Form section**: `SectionForm` gives a `Card` with header, fields and a footer with status text
on the left (`text-success` "Saved" / `text-muted-foreground` "Changes to save" /
`text-destructive` error) and the primary `Save` button on the right.

**Destructive action**: `Button variant="link"` with `text-destructive` for inline "Remove";
confirm with `confirm()` when it deletes saved data.

## Before you finish UI work

1. `pnpm lint` passes.
2. Check the screen in a real browser (`verify-in-browser` skill), desktop and `--mobile`, and look
   at it: one primary action, feedback on every action, focus rings, empty and error states, no
   horizontal scroll.
3. New user-facing flow → Playwright test in `e2e/`. New logic → Vitest test next to it.
