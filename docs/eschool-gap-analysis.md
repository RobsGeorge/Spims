# E School SAAS → Spims: Gap Analysis & Build Plan

**Version:** 1.0 · **Companion to:** `spims-spec-v0.2.md`, `claude-code-build-brief.md`, `schema.prisma`  
**Purpose:** Decide whether to adapt [E School SAAS](https://github.com/wrteam-sagar/eschool-saas) (Laravel K–12 multi-tenant ERP) for Spims, and map each spec section to **build greenfield** vs **patterns worth borrowing**.

---

## Executive summary

| Question | Answer |
|---|---|
| Can E School SAAS fit Spims as-is? | **No** — wrong domain model (K–12 physical schools vs online higher-ed), wrong stack (Laravel/Blade vs Next.js/Prisma), wrong tenancy (multi-school SaaS vs single institution). |
| Can we adapt it to cover missing requirements? | **Technically yes, but not economically.** You would rewrite ~75–85% of the core while fighting K–12 and SaaS abstractions. |
| Recommended path | **Build Spims greenfield** per this repo's design package. Use E School only as a **reference** for isolated patterns (see §18). |
| Where to build | Follow **`claude-code-build-brief.md`** Phases 0–9. Schema is already in **`schema.prisma`**. |

**Conceptual overlap:** ~15–25% (users, roles, fees-ish payments, lessons, assignments, basic exams, attendance, certs, notifications).  
**Architectural overlap:** low — entities diverge at the foundation (`school_id` + `class_section_id` vs `Program` + `CourseOffering` + `Enrollment`).

---

## Section-by-section mapping (spec v0.2)

Legend: **Phase** = build brief phase · **Strategy** = `GREENFIELD` | `INFORMED` (borrow pattern only) | **IGNORE** (E School has unrelated feature)

### §1 Roles (7)

| Spec requirement | E School has | Strategy | Spims phase |
|---|---|---|---|
| Super Admin | Super Admin (platform) | **INFORMED** — Spatie-style permission maps; different scope | Phase 1 |
| Administrative Admin | School Admin (partial) | **GREENFIELD** — admissions, registration windows, scheduling | Phases 1, 4, 7 |
| Academic Admin | School Admin (partial) | **GREENFIELD** — programs, grading scheme, templates | Phases 2, 6 |
| Financial Admin | None dedicated | **GREENFIELD** | Phase 5 |
| Instructor | Teacher | **INFORMED** — scoped to offering, not class-section | Phases 3, 6 |
| TA | None | **GREENFIELD** | Phases 3, 6 |
| Student | Student | **INFORMED** — self-service apply/enroll/pay | Phases 1, 4, 5 |
| Multi-role per person | Single role typical | **GREENFIELD** — `UserRole` union | Phase 1 |

**E School roles to ignore:** Guardian, Staff, School Admin as tenant operator, subscription-package buyer.

---

### §2 Localization

| Spec requirement | E School has | Strategy | Spims phase |
|---|---|---|---|
| AR / EN / FR, extensible | Multi-language + `is_rtl` | **INFORMED** — locale files + RTL flag | Phases 0, 8 |
| Full Arabic RTL (bidi) | Partial (Blade, not modern) | **GREENFIELD** — Tailwind logical props, `next-intl` | Phase 8 |
| UI labels curated in locale files | JSON lang files | **INFORMED** | Phase 8 |
| AI content translation + verified flag | None | **GREENFIELD** — `Translation` + `lib/ai` | Phase 2 |
| Exams single-language only | N/A | **GREENFIELD** — `Assessment.language` | Phase 6 |
| Certs/transcripts EN default | PDF templates | **INFORMED** — DomPDF → React-PDF or similar | Phase 6+ |

---

### §3 Tech stack & hosting

| Spec requirement | E School has | Strategy |
|---|---|---|
| Next.js + TypeScript | Laravel 10 + Blade/jQuery | **GREENFIELD** — do not port |
| PostgreSQL + Prisma | MySQL + Eloquent | **GREENFIELD** |
| Tailwind + shadcn/ui | Bootstrap 5 | **GREENFIELD** |
| Self-hosted VPS, Redis, backups | PHP `artisan serve` / typical LAMP | **GREENFIELD** — see Phase 9 runbooks |
| 100–200 concurrent exams | Not designed for this | **GREENFIELD** — load-test in Phase 6 |

---

### §4 Integrations

| Integration | E School has | Strategy | Spims phase |
|---|---|---|---|
| Vimeo | YouTube links in lessons | **GREENFIELD** | Phase 3 |
| Zoom + license-aware scheduler | None | **GREENFIELD** | Phase 7 |
| Email (OTP + notifications) | Email templates, FCM | **INFORMED** — mail plumbing only | Phases 1, 7 |
| WhatsApp | None | **v2 — skip v1** | — |
| PayPal | None (Stripe/Razorpay) | **GREENFIELD** | Phase 5 |
| Paymob / Cashier | Razorpay (India) | **GREENFIELD** — different APIs | Phase 5 |

---

### §5 Payments, currency & wallet

| Spec requirement | E School has | Strategy | Spims phase |
|---|---|---|---|
| USD + EGP regional pricing, no conversion | Single-currency class fees | **GREENFIELD** | Phase 5 |
| Gateway routing by region | Stripe/Razorpay per school | **INFORMED** — webhook idempotency pattern | Phase 5 |
| Manual payment + proof + verify | Subscription manual billing | **INFORMED** — audit trail concept | Phase 5 |
| Numbered receipt PDF | Fee receipts (basic) | **INFORMED** — PDF generation idea | Phase 5 |
| 4-bucket wallet + points ledger | None | **GREENFIELD** | Phase 5 |
| Split payment (wallet + card) | None | **GREENFIELD** | Phase 5 |
| Refunds to original currency | None | **GREENFIELD** | Phase 5 |
| Donations | None | **GREENFIELD** | Phase 5 |

**E School model mismatch:** fees bind to **class + session year + installments**, not **course catalog + offering + wallet**.

---

### §6 Academic model

| Spec requirement | E School has | Strategy | Spims phase |
|---|---|---|---|
| Academic Year → Semester (term dates) | Session Year; Semester = month ranges only | **GREENFIELD** | Phases 2–4 |
| Programs (diploma/certificate/degree) | None | **GREENFIELD** | Phase 2 |
| Course catalog + credit hours | Subject ( tied to class ) | **GREENFIELD** | Phase 2 |
| Course Offering (semester run) | Class + ClassSection | **GREENFIELD** | Phase 3 |
| Prerequisites | None | **GREENFIELD** | Phase 2 |
| Grading scheme (letter → GPA → %) | Percentage grade bands only | **INFORMED** — band table idea | Phase 2 |
| Retake replaces grade, history kept | Promote student (different) | **GREENFIELD** | Phase 6 |
| Cumulative GPA per program | None | **GREENFIELD** | Phase 6 |
| Cross-program credit reuse | None | **GREENFIELD** — `AcademicRecord` + `ProgramRequirementFulfillment` | Phase 6 |
| Degree audit | None | **GREENFIELD** | Phase 4 |
| Assessment criteria (weighted 100%) | Exam marks per subject | **GREENFIELD** | Phases 2, 6 |
| Standalone / self-paced courses | None | **GREENFIELD** | Phases 3–4 |
| Interest flags → admin threshold | None | **GREENFIELD** | Phase 2 |
| Clone course into offering | None | **GREENFIELD** | Phase 3 |
| Seat cap + waitlist | None | **GREENFIELD** | Phase 4 |

**Core mismatch:** E School's hierarchy is `School → Class → Section → Subject → Student`. Spims is `Program → Course (catalog) → CourseOffering → Week → ContentItem → Enrollment`.

---

### §7 Accounts & Admissions

| Spec requirement | E School has | Strategy | Spims phase |
|---|---|---|---|
| Email OTP signup | Admin-created users / admission_no login | **GREENFIELD** | Phase 1 |
| Multi-role accounts | Single role | **GREENFIELD** | Phase 1 |
| Standalone learner browse → enroll | None | **GREENFIELD** | Phases 4–5 |
| Per-program application form builder | `FormField` for student extras only | **INFORMED** — dynamic field types | Phase 4 |
| Document uploads (ID, priest reference, etc.) | Student image upload | **INFORMED** — file upload to storage | Phase 4 |
| Round-robin reviewer assignment | None | **GREENFIELD** | Phase 4 |
| Application states + matriculation | Printable admission PDF only | **GREENFIELD** | Phase 4 |
| No application fee | N/A | **GREENFIELD** | Phase 4 |

---

### §8 Enrollment & Registration

| Spec requirement | E School has | Strategy | Spims phase |
|---|---|---|---|
| Registration window (term-wide) | None | **GREENFIELD** | Phase 4 |
| Rule engine (prereq, credits, seats, hold, conflict) | None | **GREENFIELD** | Phase 4 |
| Waitlist + promotion | None | **GREENFIELD** | Phase 4 |
| Week-1 preview + all week titles | None | **GREENFIELD** | Phase 3 |
| Add/drop → full wallet refund | None | **GREENFIELD** | Phases 4–5 |
| Withdrawal → partial refund + "W" | None | **GREENFIELD** | Phases 4–5 |
| Schedule conflict warn/block | Timetable (display only) | **INFORMED** — conflict detection is new logic | Phase 4 |
| Date-gated weeks; lifetime access after pass | None | **GREENFIELD** | Phase 3 |
| Admin override (audited) | None | **GREENFIELD** — `withAudit()` | All phases |

---

### §9 LMS — content & assignments

| Spec requirement | E School has | Strategy | Spims phase |
|---|---|---|---|
| Offering → Weeks → Items | Lesson + LessonTopic (flat) | **GREENFIELD** | Phase 3 |
| Item types (Vimeo, PDF, text, assignment, quiz, exam, discussion) | file/youtube/video/link | **INFORMED** — media attachment pattern | Phase 3 |
| Assignment file + text submission | File submission | **INFORMED** | Phase 6 |
| Allowed file types (admin-set) | MIME validation | **INFORMED** | Phase 6 |
| Escalating late penalty | None | **GREENFIELD** | Phase 6 |
| TA content/grade rights | Teacher only | **GREENFIELD** | Phases 3, 6 |

---

### §10 Exam / Assessment Engine

| Spec requirement | E School has | Strategy | Spims phase |
|---|---|---|---|
| Quiz vs Exam modes | Online exam (one mode) | **GREENFIELD** | Phase 6 |
| 10+ question types | MCQ (+ options) only | **GREENFIELD** | Phase 6 |
| Question banks + randomization | Per-exam question pick | **INFORMED** — question pool concept | Phase 6 |
| AI essay grading assist | None | **GREENFIELD** | Phase 6 |
| Multi-attempt scoring rules | Single attempt | **GREENFIELD** | Phase 6 |
| Server timer, autosave, focus-loss | Basic timed exam | **INFORMED** — timer exists; integrity is greenfield | Phase 6 |
| Auto-submit on timeout/disconnect | Partial | **GREENFIELD** — BullMQ job at `dueAt` | Phase 6 |
| Results visibility config | Basic result list | **GREENFIELD** | Phase 6 |

**Reuse estimate:** ~10% — only the idea of linking questions to an exam instance.

---

### §11 Gradebook

| Spec requirement | E School has | Strategy | Spims phase |
|---|---|---|---|
| Weighted component rollup | Exam result per subject | **GREENFIELD** | Phase 6 |
| Attendance as grade component | Attendance % separate | **GREENFIELD** | Phases 6–7 |
| Discussion component | None | **GREENFIELD** | Phases 6–7 |
| Late penalty on assignments | None | **GREENFIELD** | Phase 6 |
| Special grades W, P/F, AU, IP | Pass/fail only | **GREENFIELD** | Phase 6 |
| Instructor lock → transcript + GPA | Manual exam marks upload | **GREENFIELD** | Phase 6 |
| Academic Admin reopen (audited) | Exam result edit permission | **INFORMED** — permission gate | Phase 6 |
| Released-items-only visibility | None | **GREENFIELD** | Phase 6 |

---

### §12 Attendance & Live Sessions

| Spec requirement | E School has | Strategy | Spims phase |
|---|---|---|---|
| Recurring + ad-hoc live sessions | None | **GREENFIELD** | Phase 7 |
| Zoom auto-create + Join window | None | **GREENFIELD** | Phase 7 |
| Zoom attendance import + threshold | Manual daily attendance | **INFORMED** — present/absent enum | Phase 7 |
| Recording auto-link | None | **GREENFIELD** | Phase 7 |
| License-aware scheduler (1 host) | None | **GREENFIELD** | Phase 7 |
| Session reminders | Notification system | **INFORMED** | Phase 7 |

**E School attendance** is class-section daily roll call — not compatible with Zoom participant reports.

---

### §13 Discussions

| Spec requirement | E School has | Strategy | Spims phase |
|---|---|---|---|
| Cohort full board vs self-paced Q&A | None | **GREENFIELD** | Phase 7 |
| Graded threads + auto-assess participation | None | **GREENFIELD** | Phase 7 |
| Moderation, pin/lock, visibility | None | **GREENFIELD** | Phase 7 |
| Attachments + @mention notifications | Announcements only | **INFORMED** — announcement pattern | Phase 7 |

---

### §14 Credentials

| Spec requirement | E School has | Strategy | Spims phase |
|---|---|---|---|
| Full transcripts | None | **GREENFIELD** | Phase 6 |
| Program + standalone certificates | Certificate templates (ID cards) | **INFORMED** — template + PDF | Phase 6 |
| Serial + QR public verify page | None | **GREENFIELD** | Phase 6 |
| Signatory per program/course | None | **GREENFIELD** | Phases 2, 6 |
| No cert for in-program individual course | N/A | **GREENFIELD** — business rule in service | Phase 6 |

---

### §15 Notifications

| Spec requirement | E School has | Strategy | Spims phase |
|---|---|---|---|
| Email + in-app (v1) | Email + FCM push | **INFORMED** — trigger list differs | Phase 7 |
| OTP, admission, payment, enrollment, grades, sessions, discussions, waitlist | Partial (fees, general) | **GREENFIELD** — event wiring | Phase 7 |

---

### §16 Open ops items

| Item | Spims handling |
|---|---|
| Zoom host licenses (1 vs many) | `Setting` key + license-aware scheduler in Phase 7; UI shows conflict when overlapping |
| No "excused" attendance | Already spec'd as present/absent only — no E School carryover |

---

## What E School adds that Spims does NOT need

Strip or ignore entirely when evaluating reuse:

| E School feature | Why irrelevant to Spims |
|---|---|
| Multi-tenant `School` + subdomain SaaS | Spims is single institution |
| Subscription packages / addon billing for schools | No B2B tenant billing |
| Class / Section / Medium / Stream | K–12 physical structure |
| Guardian / Parent mobile APIs | Not in Spims v1 roles |
| Staff payroll, leave, expenses | Out of scope |
| Promote student between classes | Different from retake/GPA model |
| ID card generation | Different from transcript/credentials |
| Razorpay / Stripe for school subscriptions | Wrong gateways and use case |

---

## Build plan: spec section → phase (quick reference)

| Spec § | Topic | Primary phase(s) |
|---|---|---|
| 1 | Roles | 1 |
| 2 | Localization | 0, 2, 8 |
| 3 | Stack / hosting | 0, 9 |
| 4 | Integrations | 3, 5, 7 |
| 5 | Payments & wallet | 5 |
| 6 | Academic model | 2, 3, 4, 6 |
| 7 | Admissions | 4 |
| 8 | Enrollment | 4 |
| 9 | LMS content | 3, 6 |
| 10 | Assessment engine | 6 |
| 11 | Gradebook | 6 |
| 12 | Live sessions / attendance | 7 |
| 13 | Discussions | 7 |
| 14 | Credentials | 6 |
| 15 | Notifications | 1, 7 |

Full acceptance criteria per phase: **`claude-code-build-brief.md`**.

---

## Patterns worth borrowing from E School (reference only)

Do **not** fork the Laravel codebase. When implementing Spims, these E School areas can inform design:

| Pattern | E School location | Apply in Spims as |
|---|---|---|
| RBAC with granular permissions | Spatie `laravel-permission`, seeders | `authorize()` + permissions matrix |
| Payment webhooks + idempotency | `WebhookController`, `SubscriptionWebhookController` | `lib/payments/webhooks` with signature verify |
| Manual payment recording | `SubscriptionController` bill payment | FIN manual payment + verify flow |
| Assignment submission | `AssignmentController`, API | `AssignmentSubmission` service |
| File upload + storage | `FilesInterface`, lesson attachments | R2 signed uploads in `lib/storage` |
| Online exam flow (basic) | `OnlineExamController`, student API | Starting point for `ExamRunner` UX only |
| Grade bands (% ranges) | `GradeController` | `GradingScheme` + `GradeBand` (extended with GPA) |
| Multi-language + RTL | `Language` model, `LanguageManager` | `Language` + `next-intl` + RTL QA |
| Dynamic form fields | `FormField` model | `ApplicationFormField` (admissions-specific) |
| PDF generation | DomPDF in fees/certs | Receipt + credential PDF jobs |
| Notification helpers | `notification_helper.php`, FCM | Email + in-app notification service |
| Audit concept | Partial (payment logs) | Central `AuditLog` + `withAudit()` (stronger in Spims) |

---

## Decision matrix

| If your priority is… | Choose |
|---|---|
| Fastest path to spec-compliant Spims v1 | **Greenfield** in this repo (Phases 0–9) |
| Lowest license cost / no new stack | Still **greenfield** — adapting E School costs more dev time than building Spims |
| Reusing existing Laravel hosting | New Laravel app shaped to Spims schema — **not** E School fork |
| Learning from existing school software | Read E School as **reference** using §18 above |

---

## Next steps

1. Confirm **`docs/schema.prisma`** matches spec v0.2 (it does — ~50 models, 9 contexts).
2. Run **`docs/phase-0-scaffold.md`** if not already done.
3. Execute **`docs/claude-code-build-brief.md`** one phase at a time.
4. Use **`docs/entity-model-overview.md`** for a readable map of entities and relationships.
5. Do **not** invest in porting E School — refer back to this doc when tempted to "just reuse" a module.
