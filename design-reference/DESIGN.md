# Spims — DESIGN.md (design system, agent-friendly)
> Starter design system for Cursor/Claude Code to follow. Replace or merge with Google Stitch's exported `DESIGN.md` when you generate it. **Rule for the agent: use these tokens only — never hard-code colors/spacing. Map them into `tailwind.config`, `globals.css` (CSS variables), and the admin-editable `Theme` model.**

## Brand & tone
Calm, modern, quietly reverent — a Coptic Orthodox academic institution. Friendly and approachable, never sterile. Generous whitespace, clear hierarchy, card-based surfaces.

## Color tokens
Semantic names map to CSS variables `--color-*`. Provide **light** and **dark** sets.

| Token | Light | Dark |
|---|---|---|
| primary | `#7B1E3B` (burgundy) | `#E0859B` |
| primary-foreground | `#FFFFFF` | `#1A1014` |
| accent | `#C8A24B` (gold) | `#D8B868` |
| background | `#FAF8F6` | `#15110F` |
| surface (card) | `#FFFFFF` | `#1E1A18` |
| muted | `#F1ECE8` | `#2A2422` |
| muted-foreground | `#6B5F58` | `#A89C94` |
| foreground (text) | `#1F1A17` | `#F3EEEA` |
| border | `#E7DFD9` | `#332C28` |
| ring (focus) | `#7B1E3B` | `#E0859B` |
| success | `#2E7D5B` | `#4FB286` |
| warning | `#B8860B` | `#E0A82E` |
| danger | `#B23A48` | `#E06A78` |

## Typography
- Font: **Inter** (Latin) + **IBM Plex Sans Arabic** (Arabic, loaded for `ar`).
- Scale: display 32/40 · h1 24/32 · h2 20/28 · h3 16/24 · body 14/22 · small 12/18.
- Headings semibold; body regular; numbers tabular in tables.

## Spacing & radius
- Spacing scale (px): 4, 8, 12, 16, 24, 32, 48, 64.
- Radius: sm 8 · md 12 · lg 16 · **2xl 24** (default card) · full (pills/avatars).

## Elevation
- card: subtle 1px border + soft shadow `0 1px 3px rgba(0,0,0,.06)`.
- popover/drawer: `0 8px 30px rgba(0,0,0,.12)`. Dark mode: lower opacity, lighter borders.

## Components (use shadcn/ui primitives)
- **Buttons:** primary (burgundy), secondary (muted), ghost, destructive (danger), outline. Radius md. Clear hover + focus-ring.
- **Cards:** surface bg, border, radius 2xl, 16–24 padding. Card title h3 + optional description (muted-foreground).
- **Inputs/selects:** border, radius md, focus ring; label above; helper/error below.
- **Badges:** status colors (e.g., Accepted=success, Waitlisted=warning, Rejected=danger, Pending=muted).
- **Tables (`DataTable`):** zebra-free, 1px row borders, sticky header, sortable; **collapse to stacked cards under `md`**.
- **Sidebar:** icon + label items grouped by section; active item uses primary tint; collapses to a drawer/bottom-nav on mobile.
- **Topbar:** global search, language switcher, light/dark toggle, notifications bell, avatar menu.

## States
- hover: surfaces lift slightly (shadow + −1px translate); list items get a muted background.
- focus: always a visible 2px `ring` outline (keyboard a11y).
- disabled: 50% opacity, no pointer.
- loading: skeletons matching the final layout. empty: friendly illustration/line + a primary CTA.

## Responsive (mobile-first)
- Breakpoints: sm 640 · md 768 · lg 1024 · xl 1280.
- < md: sidebar → drawer/bottom-nav; tables → cards; multi-column grids → single column; exam runner one-question-at-a-time.
- Touch targets ≥ 44px.

## RTL (Arabic)
- `dir="rtl"` on `<html>` for `ar`. Use **logical** Tailwind utilities (`ps/pe`, `ms/me`, `start/end`) — never `pl/pr/ml/mr`.
- Mirror directional icons (chevrons, arrows, back/next).

## Motion (Framer Motion)
- Durations 150–250ms, soft easing. Page transitions: subtle fade/slide. Lists: stagger. Modals/sheets: spring. Respect `prefers-reduced-motion`.

## Token → code mapping (for the agent)
1. Put the table above into `globals.css` as `:root { --color-primary: … }` and `.dark { … }`.
2. Reference them in `tailwind.config` `theme.extend.colors` (e.g. `primary: "hsl(var(--color-primary))"`).
3. Seed the **default `Theme` row** with these same tokens so the Administrative Admin can re-theme later. Components read tokens, never literals.