# Spims — Roles × Permissions Matrix (v1)
Traces to spec v0.2 + schema.prisma. This is the contract the backend authorizes against.

## Roles
`SA` Super Admin · `ADM` Administrative Admin · `ACA` Academic Admin · `FIN` Financial Admin · `INS` Instructor · `TA` Teaching Assistant · `STU` Student

> **Super Admin (SA) has full access to everything** and is therefore omitted from the tables below — assume `F` in every cell. The tables show the other six roles.

## Legend
- `F` Full (create / read / update / delete within the context)
- `R` Read-only
- `O` Own-scoped (only resources they're attached to — e.g. an offering they teach, their own record)
- `—` No access
- A verb (e.g. `submit`, `lock`) means only that specific action is allowed.

## Scoping model (how `O` is decided)
Authorization = **role check** AND **scope predicate**:
- **Instructor/TA scope:** must be an `OfferingStaff` row on the target offering.
- **Student scope:** must own the record (their `Enrollment`, `Application`, `Wallet`, etc.).
- **Reviewer scope:** `Application.reviewerId == userId` (round-robin assigned), unless `ADM`/`SA`.
- Every authorization decision and every state change emits an `AuditLog` entry.
- A user's effective permission = **union** of all their roles' permissions (multi-role supported).

---

## 1. Identity & Access
| Capability | ADM | ACA | FIN | INS | TA | STU |
|---|---|---|---|---|---|---|
| Manage user accounts (create/edit/suspend) | F | — | — | — | — | — |
| Assign system roles (admin/instructor/TA/student) | F¹ | — | — | — | — | — |
| Designate application reviewers (`isReviewer`) | F | — | — | — | — | — |
| View/edit **own** profile & preferred language | O | O | O | O | O | O |

¹ ADM may assign Instructor/TA/Student/Financial/Academic roles; **only SA may grant Super Admin or Administrative Admin.**

## 2. Localization
| Capability | ADM | ACA | FIN | INS | TA | STU |
|---|---|---|---|---|---|---|
| Enable languages / set RTL | — | F | — | — | — | — |
| Edit & **verify** content translations | R | F | — | O | O | — |
| Trigger AI translation of content | — | F | — | O | O | — |

## 3. Academics (curriculum)
| Capability | ADM | ACA | FIN | INS | TA | STU |
|---|---|---|---|---|---|---|
| Programs: create/edit, requirements, caps, signatory² | R | F | — | — | — | — |
| Courses: create/edit, prerequisites, standalone/free flags | R | F | — | — | — | — |
| **Course pricing** (USD/EGP defaults & overrides) | R | R | F | — | — | — |
| Grading scheme & passing thresholds | R | F | — | — | — | — |
| Assessment templates (default weighting) | R | F | — | R | R | — |
| Course interest flags | R(count) | R(count) | — | — | — | flag |

² Signatory **name/title** is set by ADM at program/standalone-course creation; ACA owns the rest. ³ **Pricing is owned by Financial Admin** — FIN sets/edits USD & EGP prices on courses and offerings; ACA creates the course shell only.

## 4. Semesters & Scheduling
| Capability | ADM | ACA | FIN | INS | TA | STU |
|---|---|---|---|---|---|---|
| Academic years & semesters (dates) | F | R | — | R | R | R |
| Registration window, add/drop & withdrawal weeks, refund % | F | R | — | R | R | R |

## 5. Offerings & Content
| Capability | ADM | ACA | FIN | INS | TA | STU |
|---|---|---|---|---|---|---|
| Create/clone offerings, set seat cap & attendance threshold | R | F | — | — | — | — |
| Staff offerings (assign Instructor/TA) | R | F | — | — | — | — |
| Edit content (weeks, items, video, readings) | — | F | — | O | O | — |
| Post announcements | — | F | — | O | O | view |
| View course content | R | F | — | O | O | O⁴ |

⁴ Students see Week-1 + all week titles **pre-enrollment**; full content after enrollment; **lifetime access after passing**.

## 6. Live Sessions & Attendance
| Capability | ADM | ACA | FIN | INS | TA | STU |
|---|---|---|---|---|---|---|
| Schedule live sessions (auto-creates Zoom)⁵ | F | R | — | R(own) | R(own) | — |
| Join live session | — | — | — | O | O | O |
| Import Zoom attendance / manual override | — | F | — | O | O | — |
| View own attendance | — | — | — | — | — | O |

⁵ Scheduler is **license-aware** (1 host in v1): blocks overlapping live sessions account-wide.

## 7. Assessment Engine
| Capability | ADM | ACA | FIN | INS | TA | STU |
|---|---|---|---|---|---|---|
| Question banks & questions | — | F | — | O | O | — |
| Create/configure quizzes & exams (timing, integrity, visibility) | — | F | — | O | O | — |
| Take quiz/exam (start, autosave, submit) | — | — | — | — | — | O |
| Grade manual questions / override AI essay score | — | R | — | O | O | — |
| View attempt analytics | — | R | — | O | O | O(own) |

## 8. Gradebook & Records
| Capability | ADM | ACA | FIN | INS | TA | STU |
|---|---|---|---|---|---|---|
| Configure gradebook components/weights | — | F | — | O | R | — |
| Enter/edit item grades | — | R | — | O | O | — |
| **Submit & lock** final grades | — | — | — | `lock`(O) | — | — |
| **Reopen** locked grades | — | `reopen` | — | — | — | — |
| View transcript / degree audit | R | F | — | O(students) | — | O(own) |
| Issue / regenerate credentials | `issue` | F | — | — | — | — |
| Verify a credential (public QR page) | public | public | public | public | public | public |

## 9. Admissions
| Capability | ADM | ACA | FIN | INS | TA | STU |
|---|---|---|---|---|---|---|
| Build per-program application forms | F | R | — | — | — | — |
| Submit application | — | — | — | — | — | O |
| Review & decide (accept/reject/waitlist) | O⁶ | — | — | — | — | — |
| Reassign reviewer / view all applications | F | — | — | — | — | — |

⁶ Round-robin: a reviewer acts on applications where `reviewerId == self`; ADM/SA can act on any & reassign. **Only Administrative Admins decide.**

## 10. Enrollment
| Capability | ADM | ACA | FIN | INS | TA | STU |
|---|---|---|---|---|---|---|
| Register / drop / withdraw (self) | — | — | — | — | — | O |
| Override registration rules / financial hold | F | — | — | — | — | — |
| Manage waitlist promotion | F | R | — | R | — | — |

## 11. Finance & Wallet
| Capability | ADM | ACA | FIN | INS | TA | STU |
|---|---|---|---|---|---|---|
| Create/view invoices | R | — | F | — | — | O(own) |
| Pay (online / wallet / split) | — | — | — | — | — | O |
| Record & verify **manual** payments | — | — | F | — | — | — |
| Refunds: approve standalone, wallet adjustments | — | — | F | — | — | request |
| Grant wallet points (choose currency) | — | — | F | — | — | — |
| Donations | — | — | F(manage) | — | — | O(make) |
| Financial reports | R | — | F | — | — | — |
| Download receipt PDF | R | — | F | — | — | O(own) |

## 12. Discussions
| Capability | ADM | ACA | FIN | INS | TA | STU |
|---|---|---|---|---|---|---|
| Configure board (allow student threads) | — | F | — | O | O | — |
| Create threads | — | F | — | O | O | O⁷ |
| Post / reply | — | — | — | O | O | O |
| Moderate (pin/lock/edit/delete) | — | F | — | O | O | own-post⁸ |
| Grade discussions (auto + override) | — | R | — | O | O | — |

⁷ If `allowStudentThreads`. ⁸ Students edit/delete **their own** posts within a time window.

## 13. Audit & Settings
| Capability | ADM | ACA | FIN | INS | TA | STU |
|---|---|---|---|---|---|---|
| View audit log | R(domain)⁹ | R(domain) | R(domain) | O(own offerings) | — | — |
| Edit system settings | F(admissions/registration) | F(academic defaults) | F(payment/refund) | — | — | — |

⁹ Domain-scoped reads; **full cross-system audit access is SA-only.**

## 14. Branding & Appearance
| Capability | ADM | ACA | FIN | INS | TA | STU |
|---|---|---|---|---|---|---|
| Edit logo, site name, favicon | F | — | — | — | — | — |
| Create/edit/activate themes (light & dark tokens) | F | — | — | — | — | — |
| Choose own light/dark/system preference | own | own | own | own | own | own |

---

## Enforcement notes (for the backend)
1. **Single guard layer.** Every API route runs `authorize(user, action, resource)` before the handler — never trust the client.
2. **Two-factor decision:** role membership **+** scope predicate (ownership/staffing). Both must pass.
3. **Audit on write.** The service layer wraps every mutation and writes an `AuditLog` (actor, role, action, entity, before/after, ip, ua, requestId).
4. **Field-level guards** where needed (e.g. a TA may PATCH item scores but the `gradeStatus=LOCKED` transition is rejected for TA).
5. **Public endpoints** are explicit and minimal: credential verification, course catalog preview (Week-1 + titles), and auth.
