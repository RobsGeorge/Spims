import { ApplicationStatus, RoleType } from "@prisma/client";
import { db } from "@/lib/db";
import type { SessionUser } from "@/lib/auth/session";
import { withAudit } from "@/lib/audit";
import { AppError } from "@/lib/errors";
import { assignRoundRobinReviewer } from "@/lib/services/reviewer";
import { ensureWallet } from "@/lib/services/wallet";
import { sendApplicationDecisionEmail } from "@/lib/email";
import type {
  ApplicationDecisionInput,
  SubmitApplicationInput,
  UpdateApplicationInput,
} from "@/lib/validation/application";

function prefilledProfile(user: { firstName: string; lastName: string; email: string; phone?: string | null }) {
  return {
    firstName: user.firstName,
    lastName: user.lastName,
    email: user.email,
    phone: user.phone ?? "",
  };
}

export async function submitApplication(
  actor: SessionUser,
  input: SubmitApplicationInput,
  ctx?: { ip?: string; userAgent?: string; requestId?: string },
) {
  const form = await db.applicationForm.findFirst({
    where: { programId: input.programId, active: true },
    include: { fields: true },
  });
  if (!form) throw AppError.notFound("Application form");

  const existing = await db.application.findFirst({
    where: { applicantId: actor.id, programId: input.programId },
  });
  if (existing && existing.status !== ApplicationStatus.DRAFT) {
    throw AppError.conflict("Application already submitted for this program");
  }

  for (const field of form.fields) {
    if (!field.required) continue;
    const val = input.values.find((v) => v.fieldId === field.id);
    if (field.type === "FILE") {
      if (!val?.fileUrl) throw AppError.validation(`Missing file for ${field.label}`);
    } else if (!val?.value?.trim()) {
      throw AppError.validation(`Missing value for ${field.label}`);
    }
  }

  const reviewer = await assignRoundRobinReviewer();

  return withAudit(
    { actor, action: "application.submit", entityType: "Application", ...ctx },
    async (tx) => {
      const application = existing
        ? await tx.application.update({
            where: { id: existing.id },
            data: {
              status: ApplicationStatus.SUBMITTED,
              submittedAt: new Date(),
              reviewerId: reviewer?.id ?? null,
            },
          })
        : await tx.application.create({
            data: {
              applicantId: actor.id,
              programId: input.programId,
              formId: form.id,
              status: ApplicationStatus.SUBMITTED,
              submittedAt: new Date(),
              reviewerId: reviewer?.id ?? null,
            },
          });

      for (const v of input.values) {
        await tx.applicationFieldValue.upsert({
          where: {
            applicationId_fieldId: {
              applicationId: application.id,
              fieldId: v.fieldId,
            },
          },
          create: {
            applicationId: application.id,
            fieldId: v.fieldId,
            value: v.value ?? null,
            fileUrl: v.fileUrl ?? null,
          },
          update: { value: v.value ?? null, fileUrl: v.fileUrl ?? null },
        });
      }

      if (reviewer) {
        await tx.application.update({
          where: { id: application.id },
          data: { status: ApplicationStatus.UNDER_REVIEW },
        });
      }

      return tx.application.findUnique({
        where: { id: application.id },
        include: { values: true, program: true },
      });
    },
  );
}

export async function listApplications(actor: SessionUser, opts: { all?: boolean } = {}) {
  const isAdm =
    actor.roles.includes(RoleType.ADMINISTRATIVE_ADMIN) ||
    actor.roles.includes(RoleType.SUPER_ADMIN);

  if (!isAdm) {
    return db.application.findMany({
      where: { applicantId: actor.id },
      include: { program: true, values: true },
      orderBy: { createdAt: "desc" },
    });
  }

  return db.application.findMany({
    where: opts.all ? undefined : { reviewerId: actor.id },
    include: { program: true, applicant: { select: { id: true, email: true, firstName: true, lastName: true } } },
    orderBy: { submittedAt: "desc" },
  });
}

export async function getApplicationById(id: string) {
  const app = await db.application.findUnique({
    where: { id },
    include: {
      program: true,
      form: { include: { fields: { orderBy: { order: "asc" } } } },
      values: true,
      applicant: { select: { id: true, email: true, firstName: true, lastName: true, phone: true } },
    },
  });
  if (!app) throw AppError.notFound("Application");
  return app;
}

export async function getApplicationPrefill(actor: SessionUser) {
  const user = await db.user.findUnique({
    where: { id: actor.id },
    select: { firstName: true, lastName: true, email: true, phone: true },
  });
  if (!user) throw AppError.notFound("User");
  return prefilledProfile(user);
}

export async function updateApplication(
  actor: SessionUser,
  id: string,
  input: UpdateApplicationInput,
  ctx?: { ip?: string; userAgent?: string; requestId?: string },
) {
  const app = await getApplicationById(id);
  if (app.applicantId !== actor.id) throw AppError.forbidden();
  if (app.status !== ApplicationStatus.DRAFT && app.status !== ApplicationStatus.SUBMITTED) {
    throw AppError.conflict("Application cannot be edited");
  }

  if (!input.values) return app;

  return withAudit(
    { actor, action: "application.submit", entityType: "Application", entityId: id, ...ctx },
    async (tx) => {
      for (const v of input.values!) {
        await tx.applicationFieldValue.upsert({
          where: {
            applicationId_fieldId: { applicationId: id, fieldId: v.fieldId },
          },
          create: {
            applicationId: id,
            fieldId: v.fieldId,
            value: v.value ?? null,
            fileUrl: v.fileUrl ?? null,
          },
          update: { value: v.value ?? null, fileUrl: v.fileUrl ?? null },
        });
      }
      return getApplicationById(id);
    },
  );
}

async function matriculateStudent(applicantId: string, programId: string) {
  await ensureWallet(applicantId);
  return db.studentProgram.upsert({
    where: { studentId_programId: { studentId: applicantId, programId } },
    create: { studentId: applicantId, programId, status: "ACTIVE" },
    update: { status: "ACTIVE" },
  });
}

export async function decideApplication(
  actor: SessionUser,
  id: string,
  input: ApplicationDecisionInput,
  opts: { isAnyAdm?: boolean },
  ctx?: { ip?: string; userAgent?: string; requestId?: string },
) {
  const app = await getApplicationById(id);
  if (!opts.isAnyAdm && app.reviewerId !== actor.id) {
    throw AppError.forbidden("Not assigned reviewer");
  }
  if (
    app.status !== ApplicationStatus.SUBMITTED &&
    app.status !== ApplicationStatus.UNDER_REVIEW
  ) {
    throw AppError.conflict("Application already decided");
  }

  const result = await withAudit(
    {
      actor,
      action: "application.decide",
      entityType: "Application",
      entityId: id,
      before: { status: app.status },
      ...ctx,
    },
    async (tx) => {
      const updated = await tx.application.update({
        where: { id },
        data: {
          status: input.decision,
          decisionNote: input.decisionNote ?? null,
          decidedAt: new Date(),
        },
      });

      if (input.decision === ApplicationStatus.ACCEPTED) {
        await matriculateStudent(app.applicantId, app.programId);
      }
      return updated;
    },
  );

  await sendApplicationDecisionEmail(
    app.applicant.email,
    app.program.name,
    input.decision,
    input.decisionNote,
  );

  return result;
}

export async function reassignReviewer(
  actor: SessionUser,
  id: string,
  reviewerId: string,
  ctx?: { ip?: string; userAgent?: string; requestId?: string },
) {
  const reviewer = await db.user.findUnique({ where: { id: reviewerId } });
  if (!reviewer?.isReviewer) throw AppError.validation("User is not a reviewer");

  return withAudit(
    { actor, action: "application.review", entityType: "Application", entityId: id, ...ctx },
    async (tx) =>
      tx.application.update({
        where: { id },
        data: { reviewerId, status: ApplicationStatus.UNDER_REVIEW },
      }),
  );
}

export async function assertApplicationAccess(
  actor: SessionUser,
  application: { applicantId: string; reviewerId: string | null },
): Promise<boolean> {
  if (application.applicantId === actor.id) return true;
  if (
    actor.roles.includes(RoleType.ADMINISTRATIVE_ADMIN) ||
    actor.roles.includes(RoleType.SUPER_ADMIN)
  ) {
    return true;
  }
  return application.reviewerId === actor.id;
}
