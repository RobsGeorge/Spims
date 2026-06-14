# Spims — Frontend Architecture (v1)
Traces to spec v0.2, schema.prisma, permissions-matrix.md, api-route-structure.md.

## Stack
- **Next.js (App Router) + TypeScript**
- **Tailwind CSS** (logical properties for RTL) + **shadcn/ui** (Radix primitives)
- **Framer Motion** — page transitions & micro-interactions (respects `prefers-reduced-motion`)
- **next-intl** — i18n with `[locale]` route segment (ar / en / fr, extensible)
- **TanStack Query** — server state, caching, optimistic updates, exam autosave
- **react-hook-form + Zod** — forms (Zod schemas shared with backend)
- **lucide-react** icons (mirrored for RTL)

---

## 1. App shell & routing
Authenticated app uses **one role-aware shell** (`AppShell`) with a sidebar whose items are filtered by the user's roles (union). Route groups under `app/[locale]/`:

```
app/[locale]/
  (public)/            landing, catalog, course preview, /verify/[qrToken]
  (auth)/              login, register, verify-otp, set-password, reset
  (app)/               ← authenticated shell (AppShell layout)
    dashboard/         role-aware widgets
    settings/          profile, language, theme preference, notifications
    # STUDENT
    catalog/  apply/  courses/  courses/[offeringId]/  (player)
    courses/[offeringId]/exam/[assessmentId]/  (full-screen runner)
    grades/  transcript/  degree-audit/
    billing/  wallet/  credentials/
    # INSTRUCTOR / TA
    teach/  teach/[offeringId]/{content,assessments,gradebook,attendance,discussions,roster}
    # ADMINISTRATIVE ADMIN
    admin/{users,admissions,semesters,scheduling,enrollment,branding,settings,audit}
    # ACADEMIC ADMIN
    academics/{programs,courses,grading,templates,offerings,translations,grades,audit}
    # FINANCIAL ADMIN
    finance/{invoices,payments,pricing,refunds,wallet-admin,donations,reports,audit}
```
Server components guard each segment (redirect by role); SA sees all areas.

## 2. Page / route map per role
**Student** — Dashboard (enrolled courses, upcoming sessions, due items, balance) · Catalog & course preview · Apply (program form + my applications) · Course player (weeks/items: Vimeo, readings, text, assignments, quizzes/exams, discussions, announcements) · Exam runner · Grades · Transcript · Degree audit · Billing (invoices, checkout, receipts) · Wallet (4 balances, ledger, donate) · Credentials.

**Instructor** — Teaching dashboard (my offerings) · per-offering: Content editor · Assessment builder + question banks · Gradebook (enter grades, **submit & lock**) · Attendance (view/override) · Discussions (moderate, grade) · Announcements · Roster.

**TA** — Same as Instructor, scoped, **minus final-grade lock** and gradebook-weight config.

**Administrative Admin** — Dashboard · Users & roles · Admissions (queue, decisions, **form builder**) · Semesters (years, dates, registration windows, add/drop & withdrawal weeks) · **Scheduling** (central license-aware live-session calendar) · Enrollment (overrides, waitlists) · **Branding** (logo + themes) · Settings (admission/registration) · Audit (domain).

**Academic Admin** — Dashboard · Programs (requirements) · Courses (prerequisites) · Grading schemes & thresholds · Assessment templates · Offerings (create/clone, staff) · Translations (verify AI content) · Grades (reopen locked) · Audit (domain).

**Financial Admin** — Dashboard (revenue, outstanding) · Invoices · Payments (record manual, verify) · **Pricing** (course & offering USD/EGP) · Refunds · Wallet admin (grant points) · Donations · Reports · Audit (domain).

**Super Admin** — All of the above + role assignment for admins + full cross-system audit + system settings.

## 3. Component breakdown
**Layout / shell:** `AppShell` (role-aware `Sidebar` + `Topbar`), `Topbar` (LanguageSwitcher, ThemeToggle, NotificationsBell, UserMenu), mobile `NavDrawer` / bottom-nav.

**Primitives (shadcn/ui):** Button, Input, Select, Combobox, Dialog, Sheet, Tabs, Card, Badge, Toast, Tooltip, DropdownMenu, DatePicker, Avatar, Skeleton, `DataTable` (sortable/filterable/paginated, RTL-aware) reused across all admin lists.

**Domain components:**
- **CoursePlayer** — `WeekAccordion`, `ItemRenderer` → `VimeoPlayer`, `ReadingViewer`, `TextLesson`, `AssignmentPanel`, `QuizLauncher`, `DiscussionThread`, `AnnouncementList`. Locked/date-gated week states.
- **ExamRunner** — `ExamTimer` (server `dueAt`), `QuestionRenderer` (per type), `AutosaveController` (debounced), `IntegrityGuard` (full-screen + focus-loss logging), `ProgressRail`, `SubmitDialog`, auto-submit on timeout.
- **AssessmentBuilder** — `QuestionBankManager`, `QuestionEditor` (per type, incl. essay AI key-points/guidance), `AssessmentConfigForm` (timing, attempts, integrity, visibility, draw-from-bank).
- **Gradebook** — `ComponentWeights`, `GradeTable`, `GradeEntryCell` (AI suggestion vs final), `FinalGradeSubmitBar` (lock).
- **ApplicationFormBuilder** (drag-order `FieldList`, `FieldEditor`, `DocumentRequirementEditor`) + **ApplicationFormRenderer** (prefilled common fields).
- **Checkout** — `PaymentMethodSelector` (region-aware gateways), `SplitPaymentAllocator` (wallet + points + card), `ReceiptView`.
- **WalletPanel** — four `BalanceCard`s, `LedgerTable`, `DonateDialog`.
- **Scheduler** — `LiveSessionCalendar` with license-aware conflict warnings (1 host).
- **DegreeAudit** — `RequirementChecklist`, `ProgressRing`.
- **ThemeEditor** — `TokenEditor` (color/font/radius pickers for light & dark), `LogoUploader`, live `ThemePreview`.

**Providers (root):** `I18nProvider`, `DirectionProvider` (RTL/LTR), `ThemeProvider` (light/dark + tokens from `/api/branding`), `QueryProvider`, `SessionProvider`, `ToastProvider`.

## 4. Responsive + RTL / i18n strategy
- **i18n:** `/[locale]/…` segments; message catalogs per locale (JSON), AI-generated then curated/verified. Locale resolution: URL → cookie → `Accept-Language` → `User.preferredLocale`.
- **RTL:** `dir="rtl"` on `<html>` for Arabic via `DirectionProvider`; **Tailwind logical utilities** (`ps/pe`, `ms/me`, `start/end`) + `rtl:` variants; mirror directional icons (chevrons, arrows). shadcn/Radix are RTL-capable.
- **Fonts:** load an Arabic webfont (e.g. IBM Plex Sans Arabic / Cairo / Noto Naskh) for `ar`, Inter for Latin — swapped per locale to avoid bloat.
- **Content translation:** instructor content shows the user's locale when a **verified** translation exists; otherwise fallback with a "machine-translated / view original" hint.
- **Responsive:** mobile-first; sidebar → drawer/bottom-nav on mobile; `DataTable` → stacked cards on small screens; ExamRunner uses one-question-at-a-time on mobile; ≥44px touch targets.

## 5. Theming — light/dark + admin-editable
- **Mechanics:** the active `Theme`'s tokens become **CSS variables** injected on `:root` (light) and `.dark` (dark). `ThemeProvider` fetches `/api/branding` (public) at boot and applies variables + logo per mode.
- **User preference:** `themePreference` = LIGHT / DARK / SYSTEM (SYSTEM follows OS) — toggled in `Topbar`, persisted via `PATCH /api/me`.
- **Admin control:** ADM/SA edit logo, site name, favicon, and the **light & dark token sets** in `ThemeEditor` with live preview; one theme `isActive` at a time. Presets ship with **WCAG-AA-checked** contrast.
- **Tokens:** color roles (primary, secondary, accent, surface, muted, success/warning/danger, border, ring), radius scale, spacing, typography scale, shadows — all themeable.

## 6. Visual & motion direction (polished, smooth, intentional)
- **Identity:** clean, modern, quietly reverent — fitting an Orthodox academic institution. Default palette anchored on a deep liturgical tone (e.g. burgundy or royal blue) + a restrained gold accent; fully overridable via theme tokens. Generous whitespace, clear type hierarchy, card-based surfaces.
- **Motion (Framer Motion):** subtle route fade/slide; list **stagger** on load; spring-based modals/sheets; accordion expand; skeletons → content cross-fade; toast slide-in; `ProgressRing`/timer animations; exam timer **pulse** near expiry. Keep durations short (150–250ms) and easing soft.
- **Hover / focus micro-interactions:** card **hover-lift** (elevation + shadow), button press-scale, nav-item highlight slide, link underline-grow, icon-button background fade, tooltips on hover. Visible **focus rings** everywhere (keyboard a11y), all honoring `prefers-reduced-motion`.
- **States:** thoughtful loading skeletons, empty states with a clear CTA, inline validation, optimistic UI on mutations.
- **Accessibility:** WCAG AA contrast (enforced by theme presets), semantic landmarks, ARIA on custom widgets, full keyboard nav, RTL parity.

## 7. Data & state
- TanStack Query for all server reads/mutations; query keys per resource; optimistic updates on grading, enrollment, wallet.
- Exam autosave = debounced mutation to `PATCH /api/attempts/:id/answers`; timer is server-authoritative (client only displays).
- Notifications & discussions: polling (or SSE) in v1; WebSockets in v2.
- Forms: react-hook-form + shared Zod schemas; file uploads (documents, submissions) to object storage via signed URLs.
