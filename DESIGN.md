---
name: Spims — Sacred Academic
description: Calm, reverent SIS+LMS for a Coptic Orthodox online school — deep burgundy and academic gold on cool near-white, trilingual and RTL-first.
colors:
  # Brand — burgundy ramp (deep → soft)
  burgundy-deep: "#380014"
  burgundy: "#5d0326"
  burgundy-soft: "#7b1e3b"
  burgundy-tint: "#ffd9df"
  on-burgundy: "#ffffff"
  on-burgundy-tint: "#812340"
  # Accent — academic gold
  gold: "#eac167"
  gold-soft: "#ffdf9d"
  gold-deep: "#785a02"
  on-gold: "#251a00"
  # Light surfaces (cool-tinted near-white)
  background: "#f8f9ff"
  surface: "#ffffff"
  surface-low: "#eff4ff"
  surface-mid: "#e6eeff"
  surface-high: "#dde9ff"
  surface-variant: "#d3e3ff"
  ink: "#0b1c30"
  ink-muted: "#554245"
  border: "#dbc0c4"
  outline: "#887175"
  # Dark surfaces (deep navy-black)
  dark-background: "#0d1322"
  dark-surface-lowest: "#080e1d"
  dark-surface-low: "#151b2b"
  dark-surface: "#191f2f"
  dark-surface-high: "#242a3a"
  dark-surface-variant: "#2f3445"
  dark-ink: "#dde2f8"
  dark-ink-muted: "#dbc0c4"
  dark-primary: "#ffb1c0"
  dark-gold: "#e9c16d"
  dark-border: "#554245"
  dark-outline: "#a38b8e"
  # Status
  success: "#10b981"
  warning: "#f59e0b"
  danger: "#ef4444"
typography:
  display:
    fontFamily: "Playfair Display, Georgia, serif"
    fontSize: "48px"
    fontWeight: 700
    lineHeight: 1.2
    letterSpacing: "-0.02em"
  headline:
    fontFamily: "Playfair Display, Georgia, serif"
    fontSize: "32px"
    fontWeight: 600
    lineHeight: 1.3
    letterSpacing: "-0.01em"
  title:
    fontFamily: "Inter, system-ui, sans-serif"
    fontSize: "20px"
    fontWeight: 600
    lineHeight: 1.3
  body:
    fontFamily: "Inter, system-ui, sans-serif"
    fontSize: "16px"
    fontWeight: 400
    lineHeight: 1.6
  label:
    fontFamily: "Inter, system-ui, sans-serif"
    fontSize: "14px"
    fontWeight: 600
    lineHeight: 1
    letterSpacing: "0.01em"
  arabic:
    fontFamily: "IBM Plex Sans Arabic, Cairo, system-ui, sans-serif"
    fontSize: "16px"
    fontWeight: 400
    lineHeight: 1.7
rounded:
  sm: "8px"
  md: "16px"
  lg: "24px"
  xl: "32px"
  full: "9999px"
spacing:
  xs: "4px"
  sm: "8px"
  md: "16px"
  lg: "24px"
  xl: "32px"
  "2xl": "48px"
  gutter: "24px"
  sidebar: "280px"
  container-max: "1440px"
components:
  button-primary:
    backgroundColor: "{colors.burgundy}"
    textColor: "{colors.on-burgundy}"
    rounded: "{rounded.full}"
    padding: "10px 20px"
  button-primary-hover:
    backgroundColor: "{colors.burgundy-deep}"
    textColor: "{colors.on-burgundy}"
    rounded: "{rounded.full}"
  button-accent:
    backgroundColor: "{colors.gold}"
    textColor: "{colors.on-gold}"
    rounded: "{rounded.full}"
    padding: "10px 20px"
  button-ghost:
    backgroundColor: "{colors.surface-low}"
    textColor: "{colors.ink-muted}"
    rounded: "{rounded.md}"
    padding: "8px 16px"
  card:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.ink}"
    rounded: "{rounded.md}"
    padding: "24px"
  input:
    backgroundColor: "{colors.surface-low}"
    textColor: "{colors.ink}"
    rounded: "{rounded.md}"
    padding: "10px 16px"
  badge:
    backgroundColor: "{colors.burgundy-tint}"
    textColor: "{colors.on-burgundy-tint}"
    rounded: "{rounded.full}"
    padding: "2px 10px"
  nav-item-active:
    backgroundColor: "{colors.burgundy-tint}"
    textColor: "{colors.on-burgundy-tint}"
    rounded: "{rounded.md}"
    padding: "8px 16px"
---

# Design System: Spims — Sacred Academic

## 1. Overview

**Creative North Star: "The Reverent Reading Room"**

Spims should feel like the digital equivalent of a well-kept Orthodox academic library: hushed, ordered, and dignified, with light coming in cool and even. Authority is carried by a single deep liturgical burgundy and a restrained academic gold; everything else is calm cool-tinted near-white and generous space. The serif display voice nods to scripture and scholarship; the Inter body keeps the working surfaces of a real software product (tables, forms, gradebooks, ledgers) crisp and legible. Reverence is expressed through restraint and craft — never through applied religious decoration.

This system explicitly rejects two things named in PRODUCT.md. It is **not** heavy religious skeuomorphism (no gold-leaf textures, parchment, faux-stone, ornate Byzantine borders, candle-glow). And it is **not** legacy-SIS clutter (no dense gray enterprise tables, microscopic type, endless nested tabs). It also stays clear of the adjacent traps: gamified ed-tech energy (mascots, confetti, streaks) and the identity-less corporate-SaaS template (gradient hero, hero-metric card walls).

The system is **bilingual in structure**: every layout, component, and motion is designed to read correctly mirrored for Arabic (RTL), and a design is not done until it is right in Arabic. Latin text rides Playfair Display + Inter; Arabic rides IBM Plex Sans Arabic across the board.

**Key Characteristics:**
- Deep burgundy + academic gold on **cool** near-white (`#f8f9ff`), not warm cream.
- Serif display (Playfair) for headings; Inter for all functional UI.
- Extra-rounded shapes (16px default, 24–32px containers), soft single-layer shadows.
- Generous whitespace; density only where operators need it.
- Pill primary buttons; tonal surface layers instead of hard borders.
- RTL-first; logical properties everywhere, mirrored directional icons.

## 2. Colors

A scholarly palette: a deep burgundy spine, an academic-gold accent, and a cool-tinted near-white field that keeps the warm brand tones crisp rather than cozy.

### Primary
- **Liturgical Burgundy** (`#5d0326`): the brand spine — primary buttons, active nav, key headings, focus ring, links. The single color the eye should track to for "the important action."
- **Burgundy Deep** (`#380014`): the strongest tone — primary-button hover/active, the burgundy "feature" panels (e.g. the dashboard live-session card), high-contrast text on tint.
- **Burgundy Soft** (`#7b1e3b`): a lighter step for filled containers, hover washes, and dark-mode filled chips.
- **Burgundy Tint** (`#ffd9df`): soft background for status badges, icon chips, and the active nav-item background in light mode (text uses `#812340`).

### Secondary
- **Academic Gold** (`#eac167`): the accent — progress indicators, secondary CTAs (e.g. "Join Session"), highlights, selected states. Carries warmth so the surfaces don't have to.
- **Gold Soft** (`#ffdf9d`): soft gold container for badges and emphasis chips.
- **Gold Deep** (`#785a02`): gold text/borders on light surfaces where `#eac167` would fail contrast.

### Neutral
- **Cool Field** (`#f8f9ff`): the app background. The cool tint is deliberate — it makes burgundy and gold read as warm and intentional.
- **Card White** (`#ffffff`): raised content surfaces (cards, panels, sheets).
- **Surface Ramp** (`#eff4ff` → `#e6eeff` → `#dde9ff` → `#d3e3ff`): tonal layers for inputs, toolbars, sidebars, and hover washes — depth without hard lines.
- **Scholar Ink** (`#0b1c30`): primary text — a deep cool navy-ink, not pure black.
- **Muted Ink** (`#554245`): secondary text, captions, helper copy. Warm-leaning so it sits against the cool field. (Verify ≥4.5:1 on whatever surface it lands on.)
- **Rose Border** (`#dbc0c4`): hairline borders and dividers — a desaturated burgundy, used at low opacity so boundaries read without noise.

### Dark Mode
Dark mode lives on a deep navy-black field (`#0d1322`) with a tonal surface ramp (`#080e1d` → `#242a3a`). Following the Material-tonal flip, the **light rose** (`#ffb1c0`) takes the accent/primary role for legibility on dark, with `#7b1e3b` for filled burgundy containers; gold shifts to `#e9c16d`. Text is `#dde2f8`; borders `#554245`.

### Named Rules
**The Cool-Field Rule.** The body background is cool near-white (`#f8f9ff`), never warm cream/parchment. Warmth in this brand is carried by burgundy + gold + typography, not by the background.

**The One Burgundy Rule.** On any given screen, full-saturation burgundy marks the *single* most important action or the active location — not decoration. If two things are burgundy, one is wrong; demote it to tint or ink.

## 3. Typography

**Display Font:** Playfair Display (with Georgia, serif fallback)
**Body / UI Font:** Inter (with system-ui fallback)
**Arabic Font:** IBM Plex Sans Arabic (with Cairo fallback) — used for *all* Arabic text; the serif/sans split is Latin-only.

**Character:** A contrast-axis pairing — a high-contrast transitional serif for the reverent, editorial moments (page titles, hero, major section headings) against a neutral humanist sans that does the real product work (cards, tables, forms, buttons, labels). The serif gives Spims its scholarly voice; Inter keeps it a fast, legible tool.

### Hierarchy
- **Display** (Playfair, 700, 48px / clamp down on mobile, 1.2, -0.02em): page heroes and the single dominant title on a screen. One per view.
- **Headline** (Playfair, 600, 32px → 24px, 1.3, -0.01em): major section headings and editorial card titles where voice matters.
- **Title** (Inter, 600, 20px, 1.3): functional card titles, dialog titles, table-group headers — anywhere clarity beats voice.
- **Body** (Inter, 400, 16px, 1.6): default reading text; cap prose at **65–75ch**. Dense data (tables, ledgers) may run denser and wider.
- **Label** (Inter, 600, 14px / 12px small, 1, +0.01em): buttons, form labels, chips, table headers, metadata. Tabular numerals in tables and money.

### Named Rules
**The Serif-For-Voice Rule.** Playfair appears on display and headline levels only. Never set buttons, form labels, table cells, or dense UI in the serif — that is Inter's job. A serif button is a tell.

**The Arabic-Is-Sans Rule.** Arabic never uses the Latin serif. All Arabic text — including headings — is IBM Plex Sans Arabic, sized one notch more generously (1.7 line-height) for script legibility.

## 4. Elevation

Depth is **tonal first, shadow second**. Surfaces are separated by stepping the cool surface ramp (`#f8f9ff` field → `#ffffff` card → `#eff4ff`/`#e6eeff` insets) and by hairline rose borders at low opacity. A single soft shadow lifts genuinely floating elements; there is no multi-layer shadow vocabulary.

### Shadow Vocabulary
- **Soft Lift** (`box-shadow: 0 4px 20px rgba(0,0,0,0.05)`): the one ambient shadow — cards, sidebar, sticky topbar, hover states. In dark mode raise opacity toward `0.3` and tint toward the background.
- **Floating** (`box-shadow: 0 8px 30px rgba(0,0,0,0.12)`): popovers, dropdowns, drawers, dialogs only.

### Named Rules
**The One-Shadow Rule.** Resting surfaces get at most one soft shadow plus a hairline border. Stacked or dark/tight shadows read as "2014 app" — if the shadow is dark and the blur is small, it's wrong.

## 5. Components

### Buttons
- **Shape:** pill (`9999px`) for primary/accent actions; rounded (16px) for ghost/utility.
- **Primary:** Liturgical Burgundy (`#5d0326`) bg, white text, `10px 20px`. Hover lifts `-translate-y-0.5` and deepens to `#380014`; active `scale-95`. Soft Lift shadow.
- **Accent:** Academic Gold (`#eac167`) bg, `on-gold` (`#251a00`) text — for the prominent secondary action (e.g. "Join Session").
- **Ghost / Secondary:** surface-ramp bg (`#eff4ff`) with muted-ink text and hairline border; hover deepens one ramp step.
- **States:** every button ships default / hover / focus-visible (2px burgundy ring) / active / disabled (50% opacity) / loading (spinner + disabled). Touch targets ≥44px.

### Chips / Badges
- **Style:** pill, soft tint bg + matching deep text — Accepted/Success `#10b981` family, Waitlisted/Warning `#f59e0b`, Rejected/Danger `#ef4444`, Pending neutral, Program/brand uses burgundy-tint (`#ffd9df` / `#812340`).

### Cards / Containers
- **Corner Style:** 16px (default); large layout blocks and feature panels 24–32px.
- **Background:** Card White (`#ffffff`) on the cool field; nested insets step to `#eff4ff`/`#e6eeff` (never a card inside a card with the same fill).
- **Shadow Strategy:** Soft Lift + hairline rose border at ~30% opacity.
- **Internal Padding:** 16–24px.
- **Feature panel variant:** a burgundy-filled panel (`#5d0326`/`#380014`) with white text and a single soft gold/blur accent for the one "hero" tile per view (e.g. live session).

### Inputs / Fields
- **Style:** surface-ramp bg slightly darker than the card it sits on, 16px radius, hairline border; label above, helper/error below.
- **Focus:** border shifts to burgundy + 1px burgundy ring.
- **Error:** danger border + danger helper text; **Disabled:** 50% opacity, no pointer.

### Navigation
- **Sidebar:** 280px, surface-low bg, icon + label items grouped by section; **active item** uses burgundy-tint bg + `#812340` text + medium weight; hover uses a faint burgundy wash. Collapses to a drawer + bottom-nav under `md`.
- **Topbar:** sticky, translucent card bg with backdrop-blur and Soft Lift; holds global search (pill), language switcher, light/dark toggle, notifications bell (danger dot), avatar menu.
- **Icons:** lucide-react throughout, mirrored for RTL on directional glyphs (chevrons, arrows, back/next). Material Symbol names in the Stitch reference map to lucide equivalents.

### Signature Component — Bento Dashboard
The student dashboard uses an asymmetric bento grid (a 2-col "My Courses" list beside a 1-col burgundy live-session feature tile and a compact wallet tile), not a uniform card wall. Tiles vary in size and weight by importance.

## 6. Do's and Don'ts

### Do:
- **Do** keep the body background cool near-white (`#f8f9ff`); carry warmth through burgundy, gold, and type.
- **Do** reserve full-saturation burgundy for the single primary action / active location per screen (The One Burgundy Rule).
- **Do** set headings in Playfair and everything functional in Inter (The Serif-For-Voice Rule); use IBM Plex Sans Arabic for all Arabic.
- **Do** build every interactive component with default / hover / focus-visible / active / disabled / loading states and ≥44px touch targets.
- **Do** convey depth with tonal surface layers + one soft shadow + hairline rose borders.
- **Do** use logical Tailwind utilities (`ps/pe`, `ms/me`, `start/end`) and mirror directional icons — Arabic RTL is first-class.
- **Do** verify AA contrast on both themes; bump muted ink toward `#0b1c30` if it's even close on a tinted surface.

### Don't:
- **Don't** use warm cream / parchment / sand backgrounds — this brand is cool-field, and warm near-white is the AI default we're rejecting.
- **Don't** apply religious skeuomorphism: no gold-leaf textures, parchment, faux-stone, ornate Byzantine borders, or candle-glow. Reverence is restraint.
- **Don't** ship legacy-SIS clutter: no dense gray tables, microscopic fonts, or endless nested tabs. Density only where the task demands it; tables collapse to cards under `md`.
- **Don't** add gamified ed-tech flourishes (mascots, confetti, streak badges) or the corporate-SaaS hero-metric / identical-icon-card-wall templates.
- **Don't** set buttons, labels, table cells, or dense UI in the serif. No serif Arabic.
- **Don't** use `pl/pr/ml/mr` — they break RTL. Logical properties only.
- **Don't** stack shadows or use dark, tight drop-shadows (the "2014 app" tell). One Soft Lift maximum at rest.
- **Don't** decorate with gradient text, glassmorphism-by-default, or colored side-stripe borders.
