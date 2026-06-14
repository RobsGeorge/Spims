# Spims SIS + LMS — Claude Code / Cursor Build Brief (v1)
Companion to: `spims-spec-v0.2.md`, `schema.prisma`, `permissions-matrix.md`, `api-route-structure.md`, `frontend-architecture.md`. **Those five are the source of truth — this brief sequences the work.**

## How to use this brief
1. Give the coding agent the **Global Conventions** section first and tell it these are non-negotiable.
2. Then work **one phase at a time**. Do not start a phase until the previous phase's **Acceptance** checks pass.
3. After each phase: run migrations, run tests, do a manual acceptance pass, commit.
4. Keep changes small and reviewable; never let the agent scaffold all phases at once.

---

## Global Conventions (apply to EVERY phase)

**Stack:** Next.js (App Router) + TypeScript (`strict`) · PostgreSQL 16 + Prisma · Tailwind + shadcn/ui · Framer Motion · next-intl · TanStack Query · react-hook-form + Zod · BullMQ + Redis (jobs) · argon2id password hashing.

**Repo layout:**
```
app/[locale]/...            routes (groups: (public) (auth) (app))
components/                 ui primitives + domain components
lib/
  db.ts                     Prisma singleton
  auth/                     session, authorize(), permission map
  audit/                    AuditLog writer + withAudit() wrapper
  services/                 ALL business logic (one module per context)
  validation/               Zod schemas (shared with client)
  money.ts                  minor-unit helpers, Currency
  payments/  zoom/  ai/  storage/  email/  i18n/
prisma/schema.prisma
messages/{ar,en,fr}.json
tests/                      vitest (unit) + playwright (e2e)
```

**Decisions baked in (override if you prefer):**
- **Object storage:** S3-compatible — **Cloudflare R2** (cheap, no egress) *or* **AWS S3**. Identical code via the AWS S3 SDK; pick either just by setting the `STORAGE_*` env vars. Signed URLs only.
- **AI provider:** **Google Gemini API** (cheapest for now), accessed **only** through a `lib/ai` interface so it's swappable and a **missing key never blocks build or run** — the app degrades gracefully (content stays untranslated/flagged; essay AI-suggest is skipped, grading stays manual).
- **Auth:** custom sessions (argon2id + httpOnly secure cookie + `Session` table) + email OTP via `OtpToken`.

**Non-negotiable guardrails:**
1. **Never bypass `authorize(user, action, resource)`** — every non-public route calls it (role + scope). Public routes are an explicit allow-list (auth, catalog preview, `/api/branding`, `/verify/:qrToken`).
2. **Every mutation goes through a service wrapped by `withAudit()`** inside a DB transaction — writes actor, role, action, entity, before/after, ip, ua, requestId to `AuditLog`. Nothing changes silently.
3. **Money is integer minor units + `Currency`, always.** No floats. **No currency conversion** anywhere — USD and EGP are independent.
4. **Validate every input with Zod** before the service runs.
5. **i18n from day one:** no hard-coded user-facing strings; all via `messages/*`. RTL must work (use Tailwind logical utilities `ps/pe/ms/me/start/end`).
6. **Server-authoritative time** for exams (the `dueAt` deadline); the client never owns the clock.
7. **Idempotency keys** on payment initiation and all webhooks; **verify provider signatures** on webhooks.
8. **Tests ship with each phase** (services unit-tested; critical flows e2e).
9. Secrets only via env; commit a `.env.example`, never real secrets.

**Env vars (`.env.example`):**
```
DATABASE_URL= REDIS_URL= SESSION_SECRET= NEXT_PUBLIC_APP_URL=
GOOGLE_API_KEY=        # Gemini; AI is abstracted in lib/ai — app builds & runs without it
STORAGE_ENDPOINT= STORAGE_BUCKET= STORAGE_KEY= STORAGE_SECRET=
EMAIL_HOST= EMAIL_PORT= EMAIL_USER= EMAIL_PASS= EMAIL_FROM=
PAYPAL_CLIENT_ID= PAYPAL_SECRET= PAYPAL_WEBHOOK_ID=
PAYMOB_API_KEY= PAYMOB_HMAC= PAYMOB_INTEGRATION_ID=
CASHIER_API_KEY= CASHIER_SECRET=
ZOOM_ACCOUNT_ID= ZOOM_CLIENT_ID= ZOOM_CLIENT_SECRET=
VIMEO_TOKEN=
```

---

## Phase 0 — Foundation & safety rails
**Goal:** a runnable skeleton with the guardrails in place *before any feature*.
**Build:**
- Scaffold Next.js + TS strict, Tailwind, shadcn/ui, Framer Motion.
- next-intl with `[locale]` routing (ar/en/fr) + `DirectionProvider` (RTL on `ar`).
- `ThemeProvider` (CSS variables, light/dark), `QueryProvider`, base `AppShell` placeholder.
- Prisma + the full `schema.prisma`; first migration. `docker-compose` for Postgres + Redis (dev).
- `lib/db`, `lib/auth` (session + `authorize()` + permission map derived from the matrix), `lib/audit` (`withAudit()`), `lib/errors` (typed `AppError` + normalizer), `lib/validation`, `lib/money`, `lib/i18n`.
- Request middleware order: requestId → auth → rate-limit → locale → (handler validates + authorizes).
- `.env.example`; seed script skeleton; CI (lint, typecheck, test).
**Acceptance:** app boots; locale switch works incl. RTL; a protected dummy route is blocked without the right role; a dummy mutation writes an `AuditLog` row; CI green.
**Guardrails:** no feature merges until these layers exist and are tested.

## Phase 1 — Identity, roles, theming
**Goal:** full auth lifecycle, multi-role users, admin-configurable branding.
**Build:**
- Register → **email OTP** → set password → login/logout → password reset (argon2id, httpOnly session cookie, `Session`/`OtpToken`).
- `UserRole` multi-role; effective permissions = union. `/api/me` (profile, locale, `themePreference`).
- Users & roles admin (ADM): create/edit/suspend, assign roles — **SA-only** for granting Super/Administrative Admin. `isReviewer` toggle.
- Branding/`Theme`: `ThemeEditor` (ADM/SA) for logo, site name, favicon, light+dark tokens; one `isActive`; `/api/branding` (public) feeds CSS vars + logos. Topbar theme toggle (light/dark/system) + language switcher + user menu; role-aware `Sidebar`.
**Acceptance:** complete signup→verify→login→reset; multi-role union enforced; SA-only admin-role rule holds; theme edits apply live; light/dark/system persists per user; all actions audited.

## Phase 2 — Academics (curriculum)
**Goal:** the academic backbone.
**Build:**
- `GradingScheme`+`GradeBand`, `AssessmentTemplate`+components, `Program` (+ requirements: required/elective + `electiveCreditsRequired`, caps, signatory fields), `Course` (+ `CoursePrerequisite`, credit hours, standalone/free flags), `CourseInterestFlag`.
- Academic Admin UIs for all of the above; student "flag interest" + admin interest-count view.
- **Translation infrastructure:** `Translation` table; `lib/ai` translate job (Gemini, swappable) → stored + `verified` flag; ACA edit/verify UI. With no AI key, content is simply left untranslated/flagged (never blocks).
**Acceptance:** ACA builds a program (required/elective courses, prerequisites, grading scheme, assessment template); interest flags + counts work; AI translation produces stored, editable, verifiable content.

## Phase 3 — Offerings, content, media
**Goal:** semesters, course offerings, and learning content.
**Build:**
- `AcademicYear`/`Semester` (ADM) with registration window, add/drop & withdrawal weeks, refund %.
- `CourseOffering` (cohort vs self-paced), **clone** course content into an offering, `OfferingStaff` (ACA assigns INS/TA), seat cap, attendance threshold (default 60%).
- `Week` + `ContentItem` (Vimeo video, PDF/reading via R2 signed upload, text lesson). Content editor (INS/TA/ACA). Cohort = date-gated weeks; self-paced = unlock-on-completion; **lifetime access after passing**.
- Public **preview** (Week-1 + all week titles). **Pricing** endpoints (FIN): course defaults + offering overrides (USD/EGP).
**Acceptance:** ACA creates/clones + staffs an offering; INS builds weeks/items with Vimeo + PDFs; gating works for both modes; preview shows Week-1 + titles; FIN sets prices.

## Phase 4 — Admissions + Enrollment
**Goal:** get students in, then into courses, with all rules enforced.
**Build:**
- Per-program `ApplicationForm` builder (ADM: fields, order, required docs + types, admin notes); renderer with **prefilled common fields**; submit; document uploads (R2).
- **Round-robin** reviewer assignment (`isReviewer` + `lastReviewedAt`); decision accept/reject/waitlist → notify (email) → **matriculate** (`StudentProgram`).
- **Enrollment engine:** registration window; rule checks = prerequisites · max credits/courses · required/elective-in-program or standalone · seat capacity → **waitlist** · **financial hold** · schedule conflict (warn students / block staff). Self-paced enroll-anytime. **Drop** (full refund within add/drop) / **withdraw** (partial→none + "W"). ADM override (audited). Basic degree-audit.
**Acceptance:** applicant applies → assigned reviewer decides → accepted user matriculates and registers within window with every rule enforced; waitlist promotes; drop/withdraw refund logic correct; overrides audited.

## Phase 5 — Finance (invoices, gateways, wallet, receipts)
**Goal:** money in, money back, fully auditable.
**Build:**
- `Invoice`+lines on enrollment; **regional price resolution** (EG→EGP else USD).
- Checkout: PayPal / Paymob / Cashier + **wallet money / points** + **split payment**; gateway routing by region.
- `WalletAccount` + append-only `WalletTransaction` ledger (4 buckets); refunds (auto for withdrawal, approved for standalone) in original currency; **point grants** (FIN, currency-scoped); donations.
- **Manual payment** recording + verify (FIN); **numbered receipt PDF** (job, R2) for every payment in payer's language.
- Webhooks (PayPal/Paymob/Cashier): signature-verified, **idempotent**. Financial holds wired to enrollment.
**Acceptance:** pay via each method incl. split; manual payment → numbered receipt; refund lands in wallet in original currency; points spend per currency/region; webhooks idempotent; every money move is a ledger entry + audit.

## Phase 6 — Assessment engine + gradebook
**Goal:** the high-stakes, concurrency-sensitive core.
**Build:**
- `QuestionBank`/`Question`/`QuestionOption` (all types); `Assessment` config (timing, attempts, scoring rule, integrity flags, draw-from-bank, shuffle, results visibility).
- `AssessmentAttempt` with server `dueAt`; `AttemptAnswer` **debounced autosave**; **auto-submit job** at `dueAt`; auto-grade objective; **AI essay grading** (via `lib/ai`/Gemini, key points + guidance) → `aiSuggestedScore`/`aiRationale` with human override stored as `finalScore`; with no AI key this step is skipped and grading stays fully manual.
- `ExamRunner` UI (timer, `IntegrityGuard` full-screen + focus-loss logging, one-at-a-time/no-backtrack options).
- Assignments + submissions + grading (INS/TA), **escalating late penalty** (Setting, overridable).
- Gradebook: components from template, **points-based rollup + optional item weights**; attendance & discussion components; compute → **submit/lock** (INS) → `AcademicRecord` + **GPA per program** + `ProgramRequirementFulfillment` (**cross-program reuse**); **reopen** (ACA); released-items-only visibility; special grades W/PF/AU/IP.
**Acceptance:** a randomized timed exam runs; autosave + resume + auto-submit verified; **load-test 100–200 concurrent** on the target box; AI essay suggestion overrideable; rollup correct; lock posts to transcript/GPA; one passed record applies to two programs; reopen audited.
**Guardrails:** server-side timer only; performance-test this phase before sign-off.

## Phase 7 — Live sessions/Zoom, attendance, discussions, notifications
**Goal:** scheduled live learning + community + alerts.
**Build:**
- `SessionRecurrence` + `LiveSession`; Zoom **Server-to-Server OAuth** create-meeting; **license-aware central scheduler** (ADM) that **blocks overlapping sessions** (1 host); Join endpoint within window; reminder jobs (24h + 15m).
- Zoom webhook → recording link + **participant report import** → attendance present/absent at threshold + manual override → feeds gradebook.
- Discussions: board (cohort full / self-paced ungraded Q&A); threads (graded with participation rules **auto-score + override**; visibility open/private); posts/replies; moderation; attachments.
- Notifications (in-app + email) for OTP, admission decision, payment/receipt, enrollment, grade release, session reminders, discussion replies/@mentions, waitlist promotion.
**Acceptance:** scheduler blocks overlaps at 1 host; meetings auto-created; attendance imports + feeds gradebook; reminders fire; graded discussions auto-score + override; notifications delivered.

## Phase 8 — i18n polish, motion, responsive/RTL, accessibility
**Goal:** make it feel finished.
**Build:** complete ar/en/fr catalogs (AI-generated then human-reviewed); full **RTL QA** on every screen; Arabic font per locale; Framer Motion route transitions + hover-lift/press/focus micro-interactions + skeletons/empty states; responsive passes (mobile drawer/bottom-nav, tables→cards, mobile exam runner); **WCAG AA** audit (contrast, keyboard, ARIA); `prefers-reduced-motion`.
**Acceptance:** every screen passes RTL + mobile + a11y checks; animations smooth and reduced-motion-safe; theme presets meet AA contrast.

## Phase 9 — Deployment, seed, hardening
**Goal:** live, backed up, recoverable.
**Build:**
- **Hetzner VPS** runbook: Ubuntu, Nginx reverse proxy + TLS (Let's Encrypt), PostgreSQL + Redis, app + BullMQ workers via Docker Compose (or systemd/PM2).
- **Automated daily off-site DB backups** + a **tested restore**; log rotation; rate limiting; security headers; uptime/monitoring.
- **Seed:** default grading scheme, default active theme, a Super Admin, and a sample program/course/offering.
- Smoke tests; release runbook; **re-run the exam concurrency test on the production box**.
**Acceptance:** production reachable over HTTPS; backups run + restore verified; workers running (jobs fire); seed yields a working Super Admin + sample data; smoke tests pass; concurrency validated.

---

## Cross-phase definition of done
A phase is done only when: migrations apply cleanly · `authorize()` + `withAudit()` cover every new route/mutation · inputs Zod-validated · user-facing strings localized (ar/en/fr) and RTL-correct · money in minor units · unit + e2e tests for the phase pass · manual acceptance checklist passes · committed.

## Prompting tips for the agent
- Paste **Global Conventions** once, then drive **phase by phase**; restate "do not skip the guardrails" each phase.
- Ask it to **list the files it will touch** and the **acceptance checklist** before coding each phase.
- After coding, ask it to **run migrations + tests** and report the acceptance results before you move on.
- If it tries to introduce floats for money, auto-translate exam content, or skip `authorize()`/audit — stop and correct.
