# Design system

How every screen looks and is built. **All UI work must follow this page.** `pnpm lint` enforces
the color rules, so a violation fails CI.

## Personality: warm and human

Job hunting is stressful. The UI should feel calm, friendly and on the user's side.

- **Calm.** Warm off-white pages, white cards, soft shadows, lots of space. No harsh borders.
- **Warm.** One coral accent on warm neutrals. Coral marks the thing to do next, not decoration.
- **Human.** Plain words, short sentences, sentence case ("Save changes", not "SUBMIT").
- **One primary action per view.** Everything else is outline, ghost or a link.
- **Less, but better.** Remove before adding: no labels that repeat what's on screen, no counts
  or meta lines in navigation, no decorative dividers. If a page has one job, it has no card.

## Tokens

Defined once in `src/app/globals.css` (`:root`, exposed to Tailwind via `@theme inline`).
Use them as Tailwind classes: `bg-primary`, `text-muted-foreground`, `border-border`, `ring-ring`…

| Token | Value | Use for |
|---|---|---|
| `background` | `#FAF8F5` | Page background (set on `body`; don't repeat it) |
| `foreground` | `#1C1917` | Body text (default; don't repeat it) |
| `card` | `#FFFFFF` | Cards, inputs, popovers |
| `primary` / `primary-foreground` | `#C8452F` / white | The one main action, active nav item, links |
| `primary-hover` | `#B03B27` | Hover for primary (built into `Button`) |
| `brand` | `#E2553D` | Non-text accents only: progress bars, highlights, illustrations |
| `secondary` / `secondary-foreground` | `#F3EFEA` / ink | Secondary buttons, tags |
| `muted` / `muted-foreground` | `#F3EFEA` / `#6F6862` | Subtle fills / hints, meta text, placeholders |
| `accent` / `accent-foreground` | `#FCEBE6` / ink | Hover and selected backgrounds |
| `destructive` | `#B42318` | Errors, "Remove" |
| `success` | `#15803D` | "Saved", completed states |
| `warning` | `#B45309` | Needs attention, unsaved changes |
| `border` / `input` | `#E7E2DB` / `#DDD6CD` | Hairlines / form control borders |
| `ring` | `#E2553D` | Focus rings (`focus-visible:ring-3 ring-ring/50`) |
| `radius` | `0.75rem` | Controls `rounded-lg`, cards `rounded-2xl`, buttons and tags `rounded-full` |

Light only for the MVP. Dark mode will be added later by redefining the same tokens, so app code
never needs `dark:` classes.

### Type

Geist (`font-sans`, set on `html`). Use `font-mono` only for code or IDs.

| Role | Classes |
|---|---|
| Page title (`h1`) | `text-4xl font-semibold tracking-tight` |
| Section / card title (`h2`) | `CardTitle` (`text-lg font-semibold`) |
| Body | `text-sm` (forms, cards), `text-base` (short intros) |
| Hint / meta | `text-xs text-muted-foreground` or `text-sm text-muted-foreground` |
| Label | `Label` (`text-sm font-medium`) |

### Space and depth

- Signed-in pages start with `AppHeader` (`@/components/app-header`): brand → home, Profile, Sign out.
  Never add a page-level "Home" or "Back" link.
- Page shell: `px-4 pt-6 pb-16`, content `max-w-5xl` (editors) or `max-w-sm` (single-focus pages).
- Stacks: `gap-6` between blocks, `gap-4`/`gap-5` between fields, `gap-1.5` label → control.
- Cards pad `p-6` (built into `Card`). Only `shadow-sm`, only on cards.

## Components

Use `src/components/ui/*` (shadcn/ui, Radix base). Import from `@/components/ui/<name>`.

| Need | Use |
|---|---|
| Any button or button-styled link | `Button` (`variant`: default, outline, secondary, ghost, destructive, link; `size`: sm, default, lg, icon…). Links: `<Button asChild><Link …/></Button>` |
| Text field | `Input`, `Textarea` |
| Dropdown | `NativeSelect` + `NativeSelectOption` (native, accessible, e2e-friendly) |
| Checkbox | `Checkbox` + `Label htmlFor` |
| Surface / section | `Card`, `CardHeader`, `CardTitle`, `CardDescription`, `CardContent`, `CardFooter`. `asChild` to render a `<section>` |
| Tag, chip, count | `Badge` (`secondary` for tags) |
| Page-level message | `Alert` (`variant="destructive"` for errors; it sets `role="alert"`) |
| Class merging | `cn()` from `@/lib/utils` |

Forms build on `src/components/form.tsx` (`SectionForm`, `Field`, `TextInput`, `Select`,
`TagInput`, `ListEditor`…). Reuse them for any new form.

**Missing a component?** Add it with `pnpm dlx shadcn@latest add <name>`, then align it with the
tokens (pill buttons, `h-10` controls, `bg-card` inputs). Don't hand-roll a lookalike.

## Rules

**Must**

- Style with semantic tokens and `src/components/ui` only.
- Keep one `variant="default"` (primary) button per view.
- Give every control a visible `Label` (or `aria-label` when the context makes it obvious, e.g. table cells).
- Show errors next to the field (`text-sm text-destructive`) and page errors in an `Alert`.
- Show progress in words on the button: "Saving…", "Reading your resume…".
- Disable submit buttons until there is something to send (no unsaved changes → `Save` is disabled), so we never make a request without a real need.
- Keep focus visible. Never remove `outline`/`ring` without a replacement.
- Meet WCAG AA: text 4.5:1, UI shapes 3:1. The tokens already pass; check any new pairing.

**Must not** (lint fails)

- Raw Tailwind palette colors in app code: `text-zinc-600`, `bg-white`, `border-red-500`…
- Arbitrary colors: `bg-[#fff]`, `text-[rgb(…)]`.
- `dark:` variants.

**Must not** (review)

- Inline `style` colors, new one-off button or input class strings, `shadow-md`+.
- Coral (`primary`/`brand`) as a large background or for decoration.
- Raw `<button>`, `<input>`, `<select>` in pages when a component exists.

## Patterns

**Single-focus page** (sign in, welcome): no card, centered title, one action.

```tsx
<main className="flex flex-1 items-center justify-center px-4 pb-16">
  <div className="flex w-full max-w-sm flex-col gap-10 text-center">
    <h1 className="text-4xl font-semibold tracking-tight">…</h1>
    <Button size="lg">…</Button>
  </div>
</main>
```

**Section navigation**: plain text items, selected `bg-accent` (desktop) / `bg-primary` pill (mobile).
Status is a green check (done) or a `bg-brand` dot (needed); optional items show nothing.

**Form section**: `SectionForm` gives a `Card` with header, fields and a borderless footer with status text
on the left (`text-success` "Saved" / `text-muted-foreground` "Changes to save" /
`text-destructive` error) and the primary `Save` button on the right.

**Empty state**: one `text-sm text-muted-foreground` sentence that says what to add, plus an
outline button ("Add a job").

**Destructive action**: `Button variant="link"` with `text-destructive` for inline "Remove";
confirm with `confirm()` when it deletes saved data.

## Before you finish UI work

1. `pnpm lint` passes.
2. Check the screen in a real browser (`verify-in-browser` skill) and look at it: spacing,
   one primary action, focus rings, error and empty states.
