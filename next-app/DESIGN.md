# Garage Manager — design system

A warm, colour-blocked "workshop" system. Bone canvas, forest ink, three
accents. Hierarchy reads at a squint: one big thing per view, tiny caps
labels over oversized numerals, solid fills instead of white-on-white.

Everything here already exists in `src/app/globals.css` and
`src/components/ui.tsx`. **Do not invent new colours, radii or shadows** —
use the tokens. Do not add dependencies.

## Colour tokens (CSS vars — use `bg-[var(--forest)]`, etc.)

| Token | Hex | Use |
|---|---|---|
| `--canvas` | `#efe9dc` | page background |
| `--surface` | `#f7f3e9` | raised card on canvas |
| `--surface-bright` | `#fffdf7` | brightest tile, inputs |
| `--surface-sunk` | `#e7e0d0` | wells, tracks, inset rows |
| `--ink` | `#22392c` | body + headings (never `#000`) |
| `--ink-muted` | `#6f6a5c` | secondary copy |
| `--ink-label` | `#918a78` | tiny caps labels |
| `--ink-on-dark` | `#f3efe4` | copy on forest/terracotta |
| `--forest` | `#22392c` | primary dark fill, primary button |
| `--sage` | `#cbdcce` | soft positive tile |
| `--terracotta` | `#c8503a` | money owed, destructive, FAB |
| `--ochre` | `#d2a32b` | counts, warnings, active nav |
| `--hairline` / `--hairline-strong` | `#e0d8c8` / `#cec4b0` | borders |

Radii: `--r-tile` 20px, `--r-card` 28px, `--r-panel` 32px, `--r-control` 14px.
Buttons and badges are fully rounded (`rounded-full`).
Shadows: `--lift-1/2/3`, **floating things only** (Sheet, nav, dropdown, FAB).

## Semantic colour mapping

- Money **collected / healthy / completed** → `forest` or `sage`
- Money **owed / credit / overdue / destructive** → `terracotta`
- **Counts, stock, warnings, in-progress** → `ochre`
- Neutral facts → `cream` / `bright`

## Primitives (`@/components/ui`)

Existing, unchanged API: `Button` (primary|secondary|outline|ghost|danger|success ×
sm|md|lg|icon), `Input`, `Select`, `Textarea`, `Card`, `Badge`
(slate|blue|green|amber|red|gray, `dot`), `Field`, `EmptyState`, `ErrorState`,
`Skeleton`, `Sheet`.

New — prefer these over hand-rolled markup:

- `<BentoGrid>` — `grid-cols-2` responsive grid. Children use `col-span-2` to span.
- `<Tile tone>` — colour-blocked block. `tone`: cream|bright|sage|forest|terracotta|ochre.
- `<StatTile label value unit? footnote? icon? tone>` — caps label + huge numeral.
- `<SpecTile label value icon? tone>` — small centred fact tile (detail-page grids).
- `<HeroPanel title subtitle? eyebrow? leading? trailing? tone>` — full-bleed
  coloured detail header with floating circular controls.
- `<CircleButton onDark>` — circular icon control for hero panels.
- `<Panel title icon? action?>` — dark forest panel for procedural content.
- `<Step n>` — numbered row inside `<Panel>`.
- `<SectionHeader title icon? action?>`.

Utility classes: `.numeral` (tabular, 800, tight) for display figures,
`.tabular` for money in columns, `.tile-label` for tiny caps labels.

## Layout rules

- Page content is already wrapped by `(app)/layout.tsx`; **never** add your own
  page-level horizontal padding or max-width container.
- Mobile has a **floating nav pill**. Any page-level sticky bottom bar must sit
  above it: `bottom-[var(--nav-inset)]`. Do not add a page FAB — the global one
  lives in `app-nav.tsx` and is route-aware.
- Spacing on a 4px scale; gap *within* a group must be visibly smaller than the
  gap *between* groups. Page sections: `space-y-5`. Grids: `gap-3 sm:gap-4`.

## Craft rules (non-negotiable)

1. **No gradients.** Flat, deliberate fills only.
2. **No glows.** No coloured `shadow-*`, no `ring` used for emphasis.
3. **No `transition-all`.** Name the properties:
   `transition-[background-color,transform] duration-150 ease-out`.
4. **Break monotony.** One hero element per view; vary tile size and weight.
   A screen where every card is the same size and colour has failed.
5. **Real copy.** No lorem, no "John Doe".
6. `isolation: isolate` on anything that layers internally; no z-index above 50.
7. No `#000` / `#fff` — use the tokens.
8. Type: hierarchy from **weight and colour before size**. Headings
   `font-extrabold tracking-tight`. Body ~`text-sm`. Labels `.tile-label`.
9. Elevation: hairline borders for structure, shadow only for floating.
10. **Design every state** — hover, focus-visible, active, disabled, plus
    loading / empty / error for every async surface.
11. Motion 120–250ms, `ease-out` in / `ease-in` out, `transform`+`opacity` only.

## Known UI bugs these pages must fix

- **Status badges wrapped onto two lines** and overflowed their pill
  ("PARTIALLY PAID"). `Badge` is now `whitespace-nowrap` + truncating — but
  give badges room: put them in a `shrink-0` column, let the text beside them
  `min-w-0 truncate`.
- **List rows collided**: customer name, job number, date and amount were
  fighting on one line. Give each row a clear two-column structure —
  identity left (`min-w-0`), status/amount right (`shrink-0`), and let long
  names truncate rather than reflow the row.
- **Amounts must not sit inline with wrapping meta text.** Money goes in the
  right-hand column with `.tabular`.

## Feedback & loading contract

Three components in `@/components/ui` plus workshop spot illustrations in
`@/components/illustrations` (`SpotGear`, `SpotTyre`, `SpotTools`,
`SpotClipboard`, `SpotCone`, `SpotStamp`, `SpotCar`, `SpotBike`,
`SpotScooty`, `SpotOilCan`, and the `VEHICLE_SPOT` map).

**Pick the right one — this is the whole point:**

| Situation | Use |
|---|---|
| A list/table/grid is loading | `<Skeleton>` rows shaped like the real content. **Default choice.** |
| A whole route is loading after navigation | route `loading.tsx` with a skeleton shell |
| One section of a loaded page is still fetching | `<Skeleton>` sized to that section only — never blank the page |
| A blocking wait with nothing to skeleton | `<LoadingState label="…">` (waits 400ms first, so fast responses never flash) |
| A list is genuinely empty | `<EmptyState>` with a fitting spot illustration + the action that fills it |
| A fetch failed | `<ErrorState message onRetry>` |
| A **terminal** outcome — job invoiced, payment settled, delete done | `<ResultPanel status title description primaryAction>` |
| A routine save (field edited, part added) | a `sonner` toast. **Never** a celebration panel. |

Rules:

- **Never** replace an already-loaded page with a full-page loader on refetch.
  Keep the stale content and let the changed section update in place.
- Skeletons must mirror the real layout — same number of rows, same heights,
  same rhythm. A skeleton that doesn't match causes a visible jump on load.
- `LoadingState`'s 400ms delay is deliberate. Don't set `delayMs={0}` unless
  the wait is known to be long.
- Loading copy says what is happening: "Loading your jobs…", not "Loading…".
- Illustrations are decorative (`aria-hidden`); the words carry the meaning.
  `LoadingState` is `role="status" aria-live="polite"`.

## Navigation & action results

- **Every route segment gets a `loading.tsx`** so tapping a nav item paints a
  skeleton shell of the destination immediately instead of freezing on the old
  page. The shell should match that route's real layout.
- After a mutation, take the user to the result: creating a job → that job;
  completing a job → its invoice; recording a payment → the updated invoice;
  deleting → back to the list with a toast. Never leave someone on a dead form.
- Invalidate every query key the action touched (`["jobs"]`, `["dashboard"]`,
  `["customers"]`, `["invoice", id]`, …) so other screens are correct on arrival.
