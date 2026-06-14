import { RoleType } from "@prisma/client";

// ---------------------------------------------------------------------------
// Permission map derived from docs/permissions-matrix.md
// Each action maps to the set of roles that may perform it (at minimum).
// Scope predicates (own-scoped / offering-staff) are enforced separately in
// authorize() via the scopeCheck callback.
// SA is always allowed — checked first before consulting this map.
// ---------------------------------------------------------------------------

export type Action = string; // e.g. "user.manage", "grade.lock", "audit.read"

// Set of roles allowed to perform an action (ignoring scope predicates here).
// "any" means any authenticated user is allowed.
const PERMISSION_MAP: Record<Action, RoleType[] | "any"> = {
  // ── Identity ──────────────────────────────────────────────────────────────
  "user.manage": [RoleType.ADMINISTRATIVE_ADMIN],
  "user.assignRoles": [RoleType.ADMINISTRATIVE_ADMIN],
  // SA-only: grant SUPER_ADMIN / ADMINISTRATIVE_ADMIN (enforced at call site)
  "user.suspend": [RoleType.ADMINISTRATIVE_ADMIN],
  "profile.viewOwn": "any",
  "profile.editOwn": "any",

  // ── Localization ──────────────────────────────────────────────────────────
  "language.manage": [RoleType.ACADEMIC_ADMIN],
  "translation.edit": [RoleType.ACADEMIC_ADMIN, RoleType.INSTRUCTOR, RoleType.TA],
  "translation.verify": [RoleType.ACADEMIC_ADMIN, RoleType.INSTRUCTOR, RoleType.TA],
  "translation.aiTrigger": [RoleType.ACADEMIC_ADMIN, RoleType.INSTRUCTOR, RoleType.TA],

  // ── Academics ─────────────────────────────────────────────────────────────
  "program.manage": [RoleType.ACADEMIC_ADMIN],
  "program.read": "any",
  "course.manage": [RoleType.ACADEMIC_ADMIN],
  "course.read": "any",
  "course.setPricing": [RoleType.FINANCIAL_ADMIN],
  "gradingScheme.manage": [RoleType.ACADEMIC_ADMIN],
  "assessmentTemplate.manage": [RoleType.ACADEMIC_ADMIN],
  "courseInterest.flag": [RoleType.STUDENT],
  "courseInterest.readCount": [RoleType.ADMINISTRATIVE_ADMIN, RoleType.ACADEMIC_ADMIN],

  // ── Semesters ─────────────────────────────────────────────────────────────
  "semester.manage": [RoleType.ADMINISTRATIVE_ADMIN],
  "semester.read": "any",

  // ── Offerings ─────────────────────────────────────────────────────────────
  "offering.manage": [RoleType.ACADEMIC_ADMIN],
  "offering.staff": [RoleType.ACADEMIC_ADMIN],
  "offering.editContent": [
    RoleType.ACADEMIC_ADMIN,
    RoleType.INSTRUCTOR,
    RoleType.TA,
  ],
  "offering.setPricing": [RoleType.FINANCIAL_ADMIN],
  "offering.viewPreview": "any",
  "offering.viewContent": [
    RoleType.ADMINISTRATIVE_ADMIN,
    RoleType.ACADEMIC_ADMIN,
    RoleType.INSTRUCTOR,
    RoleType.TA,
    RoleType.STUDENT,
  ],

  // ── Live sessions & attendance ────────────────────────────────────────────
  "session.schedule": [RoleType.ADMINISTRATIVE_ADMIN],
  "session.join": [RoleType.STUDENT, RoleType.INSTRUCTOR, RoleType.TA],
  "attendance.import": [RoleType.ACADEMIC_ADMIN, RoleType.INSTRUCTOR, RoleType.TA],
  "attendance.override": [RoleType.INSTRUCTOR, RoleType.TA],

  // ── Assessment engine ─────────────────────────────────────────────────────
  "questionBank.manage": [RoleType.ACADEMIC_ADMIN, RoleType.INSTRUCTOR, RoleType.TA],
  "assessment.manage": [RoleType.ACADEMIC_ADMIN, RoleType.INSTRUCTOR, RoleType.TA],
  "assessment.take": [RoleType.STUDENT],
  "assessment.grade": [RoleType.INSTRUCTOR, RoleType.TA],

  // ── Gradebook & records ───────────────────────────────────────────────────
  "gradebook.configure": [RoleType.ACADEMIC_ADMIN, RoleType.INSTRUCTOR],
  "gradebook.enterGrades": [RoleType.INSTRUCTOR, RoleType.TA],
  "grade.lock": [RoleType.INSTRUCTOR],
  "grade.reopen": [RoleType.ACADEMIC_ADMIN],
  "transcript.viewOwn": [RoleType.STUDENT],
  "transcript.viewAny": [RoleType.ACADEMIC_ADMIN, RoleType.ADMINISTRATIVE_ADMIN],
  "credential.issue": [RoleType.ACADEMIC_ADMIN, RoleType.ADMINISTRATIVE_ADMIN],
  "credential.verify": "any",

  // ── Admissions ────────────────────────────────────────────────────────────
  "applicationForm.manage": [RoleType.ADMINISTRATIVE_ADMIN],
  "application.submit": [RoleType.STUDENT],
  "application.review": [RoleType.ADMINISTRATIVE_ADMIN],
  "application.decide": [RoleType.ADMINISTRATIVE_ADMIN],

  // ── Enrollment ────────────────────────────────────────────────────────────
  "enrollment.self": [RoleType.STUDENT],
  "enrollment.override": [RoleType.ADMINISTRATIVE_ADMIN],
  "enrollment.waitlist": [RoleType.ADMINISTRATIVE_ADMIN],
  "degreeAudit.view": [RoleType.STUDENT, RoleType.ACADEMIC_ADMIN],

  // ── Finance ───────────────────────────────────────────────────────────────
  "invoice.manage": [RoleType.FINANCIAL_ADMIN],
  "invoice.viewOwn": [RoleType.STUDENT],
  "payment.self": [RoleType.STUDENT],
  "payment.manual": [RoleType.FINANCIAL_ADMIN],
  "refund.manage": [RoleType.FINANCIAL_ADMIN],
  "refund.request": [RoleType.STUDENT],
  "wallet.viewOwn": [RoleType.STUDENT],
  "wallet.manage": [RoleType.FINANCIAL_ADMIN],
  "donation.make": [RoleType.STUDENT],
  "donation.manage": [RoleType.FINANCIAL_ADMIN],

  // ── Discussions ───────────────────────────────────────────────────────────
  "discussion.configure": [RoleType.ACADEMIC_ADMIN, RoleType.INSTRUCTOR, RoleType.TA],
  "discussion.post": [
    RoleType.ACADEMIC_ADMIN,
    RoleType.INSTRUCTOR,
    RoleType.TA,
    RoleType.STUDENT,
  ],
  "discussion.moderate": [RoleType.ACADEMIC_ADMIN, RoleType.INSTRUCTOR, RoleType.TA],
  "discussion.grade": [RoleType.INSTRUCTOR, RoleType.TA],

  // ── Audit & settings ──────────────────────────────────────────────────────
  "audit.read": [
    RoleType.ADMINISTRATIVE_ADMIN,
    RoleType.ACADEMIC_ADMIN,
    RoleType.FINANCIAL_ADMIN,
    RoleType.INSTRUCTOR,
  ],
  "audit.readAll": [], // SA only — handled before map lookup
  "settings.manage": [
    RoleType.ADMINISTRATIVE_ADMIN,
    RoleType.ACADEMIC_ADMIN,
    RoleType.FINANCIAL_ADMIN,
  ],

  // ── Branding ──────────────────────────────────────────────────────────────
  "branding.read": "any",
  "branding.manage": [RoleType.ADMINISTRATIVE_ADMIN],
};

export function getAllowedRoles(action: Action): RoleType[] | "any" {
  return PERMISSION_MAP[action] ?? [];
}

export function isActionAllowed(roles: RoleType[], action: Action): boolean {
  const allowed = getAllowedRoles(action);
  if (allowed === "any") return true;
  // Union of roles
  return roles.some((r) => allowed.includes(r));
}
