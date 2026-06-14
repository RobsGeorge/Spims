# Spims — Backend API / Route Structure (v1)
Traces to spec v0.2, schema.prisma, permissions-matrix.md.

## Architecture
- **Next.js App Router Route Handlers** (`app/api/**/route.ts`) — REST, JSON.
- **Layered:** `route handler → guard (authorize) → service → Prisma`. Handlers never touch Prisma directly.
- **Validation:** every body/query validated with **Zod** before the service runs.
- **Authorization:** one `authorize(user, action, resource)` guard (role + scope) per route; see permissions matrix.
- **Audit:** the service layer wraps mutations and writes `AuditLog`.
- **Background jobs (Redis + BullMQ):** Zoom attendance import, AI translation, AI essay grading, certificate/receipt PDF generation, notification dispatch (email now; WhatsApp v2).
- **i18n:** `Accept-Language` header selects locale; falls back to `User.preferredLocale`.
- **Regional pricing:** resolved server-side from `User.countryCode` (EG → EGP, else USD); never trust client.
- **Money:** integer minor units + currency on every amount.
- **Idempotency:** payment-initiation and all webhooks require an idempotency key; webhooks verify provider signatures.
- **Exam integrity:** server-authoritative timer (`dueAt`), debounced autosave, auto-submit job at `dueAt`.

> Roles in brackets are *allowed* roles; scope predicates (own/staffing) are enforced per the matrix. SA implicitly allowed everywhere. `[public]` = no auth.

---

## Auth & Account
| Method | Path | Roles | Notes |
|---|---|---|---|
| POST | `/api/auth/register` | [public] | email, phone, first/last name → sends OTP |
| POST | `/api/auth/verify-otp` | [public] | verifies email |
| POST | `/api/auth/set-password` | [public] | after OTP |
| POST | `/api/auth/login` | [public] | session cookie |
| POST | `/api/auth/logout` | any | |
| POST | `/api/auth/password-reset/request` | [public] | |
| POST | `/api/auth/password-reset/confirm` | [public] | |
| GET / PATCH | `/api/me` | any | own profile, locale, country |

## Users & Roles
| Method | Path | Roles | Notes |
|---|---|---|---|
| GET / POST | `/api/users` | ADM | list/create |
| GET / PATCH | `/api/users/:id` | ADM | |
| POST | `/api/users/:id/roles` | ADM (SA for admin roles) | assign/revoke |
| POST | `/api/users/:id/suspend` | ADM | |

## Localization
| Method | Path | Roles | Notes |
|---|---|---|---|
| GET | `/api/languages` | any | |
| POST / PATCH | `/api/languages` | ACA | enable, RTL |
| GET | `/api/translations` | any | by entityType+entityId |
| PUT | `/api/translations` | ACA, INS/TA(own) | upsert |
| POST | `/api/translations/:id/verify` | ACA, INS/TA(own) | set verified flag |
| POST | `/api/translate` | ACA, INS/TA(own) | enqueue AI translation job |

## Academics
| Method | Path | Roles | Notes |
|---|---|---|---|
| GET/POST | `/api/programs` | ACA (GET: any) | |
| GET/PATCH/DELETE | `/api/programs/:id` | ACA | |
| PUT | `/api/programs/:id/requirements` | ACA | required/elective courses, elective credits |
| GET/POST | `/api/courses` | ACA (GET: any) | flags, credit hours |
| GET/PATCH/DELETE | `/api/courses/:id` | ACA | non-price fields |
| PUT | `/api/courses/:id/pricing` | FIN | USD/EGP default prices |
| PUT | `/api/courses/:id/prerequisites` | ACA | |
| POST/DELETE | `/api/courses/:id/interest` | STU | interest flag |
| GET | `/api/courses/:id/interest/count` | ADM, ACA | demand signal |
| GET/POST | `/api/grading-schemes` | ACA | bands |
| GET/POST | `/api/assessment-templates` | ACA | default components |

## Semesters
| Method | Path | Roles | Notes |
|---|---|---|---|
| GET/POST | `/api/academic-years` | ADM | |
| GET/POST | `/api/semesters` | ADM | dates, registration window, add/drop & withdrawal weeks, refund % |
| PATCH | `/api/semesters/:id` | ADM | |

## Offerings & Content
| Method | Path | Roles | Notes |
|---|---|---|---|
| GET/POST | `/api/offerings` | ACA (GET: scoped) | create offering |
| POST | `/api/offerings/:id/clone` | ACA | clone course content into new offering |
| GET/PATCH | `/api/offerings/:id` | ACA, INS/TA(own R/limited) | |
| PUT | `/api/offerings/:id/staff` | ACA | assign INS/TA |
| PUT | `/api/offerings/:id/pricing` | FIN | USD/EGP price overrides |
| GET | `/api/offerings/:id/preview` | [public] | Week-1 + week titles |
| GET/POST | `/api/offerings/:id/weeks` | INS/TA(own), ACA | |
| GET/POST | `/api/weeks/:id/items` | INS/TA(own), ACA | video/reading/text/assignment/quiz/exam/discussion |
| PATCH/DELETE | `/api/items/:id` | INS/TA(own), ACA | |
| GET/POST | `/api/offerings/:id/announcements` | INS/TA(own), ACA (GET: enrolled) | |

## Assignments
| Method | Path | Roles | Notes |
|---|---|---|---|
| GET/POST | `/api/offerings/:id/assignments` | INS/TA(own) | submissionType, allowed file types, due date |
| POST | `/api/assignments/:id/submissions` | STU(enrolled) | file/text; sets isLate |
| POST | `/api/submissions/:id/grade` | INS/TA(own) | raw + final (escalating late penalty applied) |

## Live Sessions & Attendance
| Method | Path | Roles | Notes |
|---|---|---|---|
| GET/POST | `/api/offerings/:id/sessions` | ADM (INS/ACA: read) | central scheduler; license-aware; auto-creates Zoom meeting |
| POST | `/api/offerings/:id/recurrence` | ADM | generates session instances |
| GET | `/api/sessions/:id/join` | STU/INS/TA(enrolled/staff) | returns join URL within window |
| POST | `/api/sessions/:id/attendance/import` | INS/TA(own), ACA | pulls Zoom report → present/absent at threshold |
| PATCH | `/api/sessions/:id/attendance` | INS/TA(own) | manual override |
| POST | `/api/webhooks/zoom` | [public+sig] | recording ready, participant report |

## Assessment Engine
| Method | Path | Roles | Notes |
|---|---|---|---|
| GET/POST | `/api/offerings/:id/question-banks` | INS/TA(own), ACA | |
| GET/POST | `/api/question-banks/:id/questions` | INS/TA(own), ACA | options, config, AI key points/guidance |
| GET/POST | `/api/offerings/:id/assessments` | INS/TA(own) | mode, timing, attempts, integrity, visibility, draw-from-bank |
| POST | `/api/assessments/:id/attempts` | STU(enrolled) | start; sets `dueAt` (server timer) |
| PATCH | `/api/attempts/:id/answers` | STU(own) | debounced autosave |
| POST | `/api/attempts/:id/submit` | STU(own) | (auto-submit job fires at `dueAt`) |
| POST | `/api/attempts/:id/ai-grade` | INS/TA(own) | enqueue AI essay scoring → `aiSuggestedScore` |
| POST | `/api/attempts/:id/grade` | INS/TA(own) | set `finalScore` (override AI) |

## Gradebook & Records
| Method | Path | Roles | Notes |
|---|---|---|---|
| GET/PUT | `/api/offerings/:id/gradebook/components` | INS(own), ACA | points-based + optional item weights |
| GET | `/api/offerings/:id/gradebook` | INS/TA(own); STU(own, released only) | live rollup |
| POST | `/api/offerings/:id/grades/submit` | INS(own) | lock → posts AcademicRecord + GPA |
| POST | `/api/offerings/:id/grades/reopen` | ACA | audited |
| GET | `/api/students/:id/transcript` | STU(own), ACA, ADM | |
| GET | `/api/students/:id/degree-audit` | STU(own), ACA | `?programId=` met vs remaining |
| POST | `/api/credentials` | ACA, ADM(issue) | enqueue PDF; serial + QR |
| GET | `/api/verify/:qrToken` | [public] | credential verification page |

## Admissions
| Method | Path | Roles | Notes |
|---|---|---|---|
| GET/PUT | `/api/programs/:id/application-form` | ADM | fields, order, required docs, admin notes |
| POST | `/api/applications` | STU/applicant | apply to one program; common fields prefilled |
| GET | `/api/applications` | ADM (scoped to reviewer) | |
| GET/PATCH | `/api/applications/:id` | applicant(own), ADM | |
| POST | `/api/applications/:id/decision` | ADM(reviewer) | accept/reject/waitlist → notify → matriculate |
| POST | `/api/applications/:id/reassign` | ADM | reviewer reassignment |

## Enrollment
| Method | Path | Roles | Notes |
|---|---|---|---|
| POST | `/api/offerings/:id/enroll` | STU | runs all rule checks; waitlist if full |
| POST | `/api/enrollments/:id/drop` | STU | within add/drop → full refund to wallet |
| POST | `/api/enrollments/:id/withdraw` | STU | partial/no refund per semester rules → "W" |
| POST | `/api/enrollments/:id/override` | ADM | bypass holds/rules (audited) |
| POST | `/api/offerings/:id/waitlist/promote` | ADM | (or automatic) |

## Finance & Wallet
| Method | Path | Roles | Notes |
|---|---|---|---|
| GET | `/api/invoices` | FIN; STU(own) | |
| GET | `/api/invoices/:id` | FIN; STU(own) | |
| POST | `/api/invoices/:id/pay` | STU(own) | gateway/wallet/points/**split**; regional gateway routing |
| POST | `/api/payments/manual` | FIN | method, ref, proof → receipt; optional pending→verify |
| POST | `/api/payments/:id/verify` | FIN | |
| GET | `/api/payments/:id/receipt` | FIN; STU(own) | numbered PDF |
| GET | `/api/wallet` | STU(own); FIN | 4 balances + ledger |
| POST | `/api/wallet/points/grant` | FIN | choose currency |
| POST | `/api/refunds` | STU(request); FIN(approve) | standalone needs approval; withdrawal auto |
| GET/POST | `/api/donations` | STU(make); FIN(manage) | money or points |
| POST | `/api/webhooks/paypal` | [public+sig] | idempotent |
| POST | `/api/webhooks/paymob` | [public+sig] | idempotent |
| POST | `/api/webhooks/cashier` | [public+sig] | idempotent |

## Discussions
| Method | Path | Roles | Notes |
|---|---|---|---|
| GET/PATCH | `/api/offerings/:id/discussion` | INS/TA(own), ACA; STU(read) | board config; cohort=full, self-paced=ungraded Q&A |
| GET/POST | `/api/discussion/:boardId/threads` | INS/TA; STU(if allowed) | graded flags + participation rules |
| PATCH | `/api/threads/:id` | INS/TA(own) | pin/lock/visibility |
| GET/POST | `/api/threads/:id/posts` | enrolled + staff | reply via `parentPostId` |
| PATCH/DELETE | `/api/posts/:id` | author(window), INS/TA(moderate) | |
| PUT | `/api/threads/:id/grades` | INS/TA(own) | auto-score + override |

## Notifications
| Method | Path | Roles | Notes |
|---|---|---|---|
| GET | `/api/notifications` | any(own) | |
| POST | `/api/notifications/:id/read` | any(own) | |

## Branding & Theme
| Method | Path | Roles | Notes |
|---|---|---|---|
| GET | `/api/branding` | [public] | active theme tokens + logos (renders the app shell) |
| GET/POST | `/api/themes` | ADM | create/list themes |
| PUT | `/api/themes/:id` | ADM | edit logo, site name, light/dark tokens |
| POST | `/api/themes/:id/activate` | ADM | set the single active theme |

## Audit & Settings
| Method | Path | Roles | Notes |
|---|---|---|---|
| GET | `/api/audit-logs` | SA(full); ADM/ACA/FIN(domain); INS(own offerings) | filter by actor/entity/action/date |
| GET/PUT | `/api/settings/:key` | SA; domain admin per key | late-penalty curve, attendance threshold, points rules, `zoom.concurrent_hosts` |

---

## Cross-cutting middleware order
1. Request ID + structured logging
2. Auth (session → user + roles)
3. Rate limiting (tighter on auth, payment, exam autosave)
4. Locale resolution
5. Zod validation
6. `authorize()` (role + scope)
7. Handler → service (transaction + audit) → response
8. Error normalizer (consistent error shape, no internal leakage)
