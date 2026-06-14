# Spims SIS + LMS — Living Specification
**Version:** 0.2 · **Status:** Product spec complete for v1; entering engineering design.
**Product:** Student Information System + Learning Management System for **Spims**, a Coptic Orthodox online school (Christian Orthodox sciences & history).
**Reference:** Populi (inspiration, not clone). **Delivery:** one web app, fully mobile-responsive.

---

## 1. Roles (7)
| Role | Owns |
|---|---|
| **Super Admin** | Everything; system config; can do any admin action. |
| **Administrative Admin** | Admissions decisions, application-form builder, semesters & registration windows, scheduling, signatory assignment, enrollment overrides. |
| **Academic Admin** | Curriculum (programs, courses), grading scheme, passing thresholds, assessment templates, late-penalty defaults, edits/verifies AI translations, attendance thresholds, reopens locked grades. |
| **Financial Admin** | Billing, invoices, manual payment recording, refunds/wallet adjustments, financial reports. |
| **Instructor** | Owns an offering: content, assessments, grading, announcements, discussions, final-grade submit/lock. |
| **TA** | Edit content, post announcements, grade assignments/exams, assess discussions. (No final-grade lock.) |
| **Student** | Apply, enroll, learn, submit, pay, view grades/transcript/wallet. |

> A person may hold multiple roles (see engineering modeling decisions).

## 2. Localization
- Languages: **Arabic, English, French**; extensible. **Arabic = RTL** (full bidi).
- **UI labels:** AI-*generated* but **stored** as curated locale files.
- **Instructor content & announcements:** AI auto-translated + **stored**, with human **"verified" flag**; Instructor/Academic Admin can edit AI output.
- **Exams:** authored in a **single language** (no AI translation — integrity).
- **Certificates/transcripts:** English by default, other on request.

## 3. Tech stack & hosting
- **Next.js + TypeScript**, **PostgreSQL + Prisma**, **Tailwind + shadcn/ui**, polished UI + animations, responsive.
- **Self-hosted** VPS (recommended **Hetzner**): Next.js (Node) + PostgreSQL + Nginx + Redis; daily off-site DB backups. Budget ≤ $200–300/yr.
- Scale: hundreds now → **2–3k students** in 3 yrs; **100–200 concurrent** incl. **simultaneous exams** (design peak).

## 4. Integrations
- **Vimeo** (video). **Zoom** (live sessions, automated scheduling + attendance import). **Email** (OTP + notifications). **WhatsApp → v2.**
- **Gateways:** PayPal (USD/intl), Paymob (EGP), Cashier (EGP).
- ⚠️ **Zoom: only 1 licensed host today** → only 1 concurrent live meeting. Scheduler must be **license-aware**; more hosts recommended as scale grows.

## 5. Payments, currency & wallet
- **Regional pricing, NO conversion.** Each course has independent **USD price + EGP price**. Region: inside Egypt → EGP; outside → USD. **Free = explicit flag.**
- **Gateway routing:** EGP → Paymob/Cashier; USD → PayPal.
- **Manual payments** (Financial/Super Admin): method (cash/transfer/cheque), reference, date, optional proof; sequential receipt numbering; audit log; optional pending→approved.
- **Every payment → auto numbered receipt PDF** in payer's language.
- **Wallet — 4 buckets:** EGP money, USD money, **EGP points, USD points**.
  - **Points:** never expire, **1 point = 1 EGP** (and 1 USD-point = 1 USD), **spend-only** (never withdrawn, never cross-converted).
  - Spend points **matching the checkout currency/region** (EGP checkout → EGP points; USD → USD points).
  - **Refunds return in the original currency** (money or, at admin discretion, points). **Admin chooses currency** when granting points.
  - Wallet usable for **payments and donations**; **split payment** supported (wallet + card, points + card).
  - Modeled as an auditable **transaction ledger** (balances derived).

## 6. Academic model
- **Academic Years → Semesters** (start/end set by Administrative Admin; apply to all active offerings/students that term).
- **Programs:** diploma / certificate / degree; hold **required + elective** courses. Per-program: default passing threshold, max credits/sem, max courses/sem, max semesters to graduate.
- **Course (catalog):** code, **credit hours** (integer), default **USD+EGP price** (override), default **assessment template**, **prerequisites**, passing-threshold override, **standalone flag**, **free flag**.
- **Course Offering (semester run):** instructor(s)/TA(s), dates, Zoom sessions, **clonable content copy**, enrolled students, **seat cap + waitlist**.
- **Clone** a Course (with content) into a new Offering.
- **Grading scheme:** configurable **letter → GPA → %** bands (Super/Academic Admin).
- **Retake:** new grade **replaces** old (history kept; GPA uses latest).
- **GPA:** **cumulative per program** (multiple programs → multiple GPAs).
- **Cross-program credit reuse:** passes stored as **program-agnostic academic records**; program requirements **reference** them (no retake; standalone completions count later → nudge to enroll).
- **Prerequisites enforced:** ineligible courses not shown as enrollable.
- **Interest flags:** students flag dormant courses; admins watch a **threshold** to open offerings.
- **Degree audit** view (met vs. remaining).
- **Assessment criteria:** weighted components summing to 100%; **default template**; instructor/Academic Admin editable per course.

### Standalone / self-paced
Flagged. Credit + grade; **certificate on pass**; own pricing (default, override); **progress tracking** (no attendance); **enroll-and-start-anytime**; **refund on request + admin approval**; next unit unlocks **on completing the previous**; **lightweight ungraded Q&A** board only.

## 7. Accounts & Admissions
- **All users:** sign up with email, phone, first/last name → **email OTP** → set password. A person may hold multiple roles.
- **Standalone learners:** no admissions → browse → free: enroll; paid: pay → start.
- **Full-program applicants:** apply to **one program**.
  - **Per-program configurable application form** (fields, order, required documents + types, admin notes) — built by Administrative Admin.
  - **Common fields auto-filled** from prior applications.
  - Docs (configurable): national ID/passport, photo, prior education certs, **priest/father-of-confession reference**, etc. **No application fee.**
  - **Single reviewer, round-robin** among designated reviewers; **Administrative Admins decide**.
  - States: submitted → under review → **accepted / rejected / waitlisted** (binary v1; no interview, no conditional).
  - Accept → notify (email; WhatsApp v2) → **Matriculation** (Student, billing account, can register).

## 8. Enrollment & Registration
- **Semester registration window** (Administrative Admin); applies term-wide.
- **Self-service**; rules auto-enforced; **admin override**. **No approval** when rules pass.
- **Rules:** prerequisites · within max credits & courses · required/elective-in-program or standalone · **seat capacity** · **financial hold** (unpaid blocks; override) · schedule conflict.
- **Seat cap → waitlist** when full.
- **Pre-enroll transparency:** **Week 1 open** for preview + **all week titles** visible.
- **Add/drop window** (by week #): clean drop, no record, **full refund to wallet**.
- **Withdrawal** (after add/drop): **partial refund** (admin %) up to a **last withdrawal week**, then none → **"W"** on transcript; refund **automatic to wallet**.
- **Schedule conflict:** **warn** students; **block** instructors/TAs.
- **Semester weeks** date-unlock; **lifetime access after passing**.

## 9. LMS — content & assignments
- **Offering → Weeks (1…N) → Items.** Item types: Vimeo video, reading/PDF, text lesson, assignment, quiz/exam, discussion.
- **Assignments:** submission = **file upload or typed text**; admin-set **allowed file types**; **escalating late penalty %** (Academic Admin default, instructor override); **TA can grade**.
- **TA rights:** edit content, post announcements, assess in discussions, grade.

## 10. LMS — Exam / Assessment Engine
- **One engine, two modes:** **Quizzes** (low-stakes, optional multi-attempt) & **Exams** (high-stakes, single attempt, timed). Each feeds a gradebook component.
- **Question types:** single MCQ, multi-select, true/false, short answer (auto), **essay/long-answer**, matching, fill-in-blank, numeric, ordering, file-upload answer.
- **AI-assisted essay grading:** instructor/TA provide key points + guidance → AI proposes score → human can grade manually or **override**; both AI suggestion and human final are stored.
- **Question banks + randomization** (random subset, shuffled questions & options).
- **Attempts:** exams single; quizzes multi (instructor/TA-set) with **highest/latest/average**.
- **Soft integrity (v1):** randomization, **server-authoritative timer**, **debounced autosave**, focus-loss logging, optional full-screen, optional one-at-a-time/no-backtrack. (Hard proctoring v2.)
- **Timeout/disconnect:** timer-zero **auto-submits** saved answers; resume on reconnect with correct remaining time.
- **Results visibility:** configurable **per assessment** (immediate / after close / on release; reveal answers y/n).
- **Authoring:** Instructor/TA/Academic Admin. **Manual grading:** Instructor/TA.

## 11. Gradebook
- Per Offering; implements assessment criteria.
- **Component rollup:** **points-based** default, optional per-item weights.
- **Attendance component:** *(attended ÷ total) × 100*, **no allowance**, **present/absent** only.
- **Discussions component:** **manual score per student per discussion** (with auto-assist, below).
- **Late penalty:** **escalating** (Academic Admin default, instructor override).
- **Grades:** standard letters + **W, P/F-only (no GPA), AU (no grade), IP (in progress)**; **no extra credit**.
- **Finalization:** live compute → instructor **submits/locks** → posts to **transcript + GPA**; only **Academic Admin reopens** (audited).
- **Visibility:** students see running grade from **released items only**.
- **On pass:** post credit + grade to academic record; trigger certificate (standalone) / program completion.

## 12. Attendance & Live Sessions
- Per offering, **optional** live schedule: **recurring + ad-hoc** sessions.
- System **auto-creates Zoom meeting** per session, shows **Join 15 min before**, reminders **24 h + 15 min**.
- **Attendance:** auto-import Zoom participant report, **present if ≥ threshold** (per-course, set by Admin, **default 60%**), matched by email, **manual override**; **present/absent**.
- **Recording:** Zoom cloud recording **auto-linked** in offering.
- License-aware scheduling (1 host today).

## 13. Discussions
- **Cohort (semester) courses:** full board with multiple threads; **self-paced:** lightweight **ungraded Q&A** only.
- **Thread creation:** configurable per board (students allowed or not).
- **Graded threads:** stated **participation requirement** (min words/letters + number of posts/replies) → **auto-assessed**, instructor can **override**.
- **Visibility:** per-thread open-to-all vs. private-to-instructor.
- **Moderation:** instructor/TA pin/lock/edit/delete; students edit/delete own within a window.
- Attachments (images/files/Vimeo) + notifications (in-app + email) on replies/@mentions.

## 14. Credentials (v1)
- **Full transcripts**, **program certificates**, **standalone-course certificates**. **No certificate** for an individual course inside a program.
- **English by default** (other on request). **Verification required:** serial + **QR → public verify page**.
- **Signatory** set at program / standalone-course creation by Administrative Admin.

## 15. Notifications
- v1: **email** + **in-app**. WhatsApp v2. Triggers: OTP, admission decision, payment/receipt, enrollment, grade release, session reminders, discussion replies/@mentions, waitlist promotion.

## 16. Open / ops items
- ⚠️ **Zoom host licenses** — stay at 1 (sequential live) or plan UI for several?
- Minor: attendance "excused" state not used (present/absent only).

## 17. Engineering phase (next)
Core entity/relationship model → **database schema (Prisma)** → backend API + auth/permissions → frontend page/component architecture + responsive/i18n strategy → **phased Claude Code build brief**.
