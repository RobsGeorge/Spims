# Product

## Register

product

## Users

Seven roles share one role-aware app shell; each lands in a different task, never browsing for pleasure:

- **Students** — the largest, most varied audience. Mixed devices (mobile-heavy), mixed languages (Arabic / English / French), mixed digital fluency, often on uneven connections. They enroll, watch lessons, sit timed exams, check grades, pay invoices, manage a four-balance wallet. The high-stakes moments — the exam runner, checkout, the gradebook they're being judged by — must feel completely trustworthy.
- **Instructors & TAs** — domain experts (Coptic Orthodox sciences & history), not necessarily power users of software. They author course content, build assessments and question banks, grade, and submit-and-lock final grades. They need density without intimidation.
- **Administrative, Academic, and Financial Admins** — back-office operators living in queues, tables, calendars, and forms (admissions, scheduling, programs, pricing, refunds, translations). They want throughput and zero ambiguity, especially around money and irreversible actions.
- **Super Admin** — sees and governs everything, including cross-system audit.

Common thread: people handling **grades, money, and credentials** for a religious academic institution. Errors and ambiguity erode trust fast. The interface is a tool in service of a serious task, not a destination.

## Product Purpose

Spims is a combined **Student Information System + Learning Management System** for a Coptic Orthodox online school — admissions, enrollment, course delivery, assessment, grading, transcripts/credentials, billing, and a multi-currency wallet, in one trilingual (Arabic-RTL / English / French) web app, inspired by Populi.

It replaces fragmented or legacy school software with a single coherent, mobile-responsive, self-hosted system. Success looks like: a student on a phone in Arabic completes an application, sits a proctored exam, and pays an invoice without confusion or doubt; an instructor grades and locks a semester without fear of a misclick; a financial admin reconciles dual-currency payments with no rounding surprises. The product earns its keep by making consequential academic and financial actions feel **clear, correct, and calm**.

## Brand Personality

Clean, modern, quietly reverent — fitting an Orthodox academic institution. Three words: **calm, trustworthy, dignified.**

When feelings compete, **calm and trustworthy wins.** Reverence is expressed through restraint and craft — generous whitespace, clear hierarchy, considered typography, a deep liturgical anchor color (burgundy) with a sparing gold accent — never through ornament. The voice is plain, respectful, and precise: it explains consequences (locking grades, spending points, submitting an exam) without alarm or jargon. Confidence is shown by the tool disappearing into the task.

## Anti-references

- **Heavy religious skeuomorphism.** No gold-leaf icons, parchment or faux-stone textures, ornate Byzantine borders, or candle-glow effects. The reverence is real but carried by restraint, typography, and a disciplined liturgical palette — not by decoration. Literal religious imagery cheapens it.
- **Legacy SIS clutter.** No dense gray enterprise tables, microscopic fonts, or endless nested tabs (Banner / PeopleSoft / old Populi). Beating that experience is a core reason this product exists: density when the task needs it, never density as a default.

Adjacent traps to stay clear of even though not the primary anti-references: gamified ed-tech (mascots, confetti, streak badges — too casual for the stakes) and the identity-less corporate-SaaS template (gradient hero, hero-metric card grids).

## Design Principles

- **Calm under stakes.** The screens that decide grades, money, and exam outcomes must lower the heart rate, not raise it. Clarity, confirmation, and reversibility over speed or flourish. Surprise is a bug.
- **Reverence through restraint.** Identity comes from disciplined use of the liturgical palette, whitespace, and type — not applied religious decoration. When tempted to ornament, remove instead.
- **Earned familiarity, not invention.** Use the conventions users already trust (standard nav, tables, forms, modals only when nothing inline works). Never reinvent a standard affordance for flavor. The tool should disappear into the task.
- **Trilingual and RTL as first principles.** Arabic is not a translation layer bolted on; layouts, components, and motion are designed to read correctly mirrored. Logical properties, not hard-coded left/right. A design isn't done until it's right in Arabic.
- **Honest, consequence-aware copy.** State what an action does before it happens — especially irreversible ones (lock, submit, refund, spend). Plain language in three languages beats clever microcopy.
- **Density on demand.** Information-dense where operators need it (gradebooks, ledgers, queues), spacious where students need calm (course player, exam runner, checkout). Match the surface to its user, not the whole app to one rhythm.

## Accessibility & Inclusion

- **WCAG 2.1 AA** is the floor: body text ≥4.5:1, large text ≥3:1, verified against both light and dark theme token sets (admin-editable themes ship AA-checked).
- **Full RTL parity** for Arabic — not best-effort. Mirrored layouts via Tailwind logical utilities (`ps/pe`, `ms/me`, `start/end`), mirrored directional icons, and RTL-correct motion.
- **Keyboard-first**: full keyboard navigation, visible focus rings everywhere, ARIA on every custom widget (exam runner, gradebook cells, calendar, accordions).
- **`prefers-reduced-motion`** honored on every animation with a crossfade/instant fallback — already enforced globally in `app/globals.css`.
- **Inclusive of low digital fluency and constrained devices**: ≥44px touch targets, mobile-first layouts (sidebar → drawer/bottom-nav, tables → stacked cards), skeletons over spinners, and empty states that teach rather than dead-end.
