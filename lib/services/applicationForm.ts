import { db } from "@/lib/db";
import type { SessionUser } from "@/lib/auth/session";
import { withAudit } from "@/lib/audit";
import { AppError } from "@/lib/errors";
import type { UpsertApplicationFormInput } from "@/lib/validation/applicationForm";

export async function getApplicationForm(programId: string) {
  const form = await db.applicationForm.findFirst({
    where: { programId, active: true },
    include: { fields: { orderBy: { order: "asc" } } },
  });
  return form;
}

export async function upsertApplicationForm(
  actor: SessionUser,
  programId: string,
  data: UpsertApplicationFormInput,
  ctx?: { ip?: string; userAgent?: string; requestId?: string },
) {
  const program = await db.program.findUnique({ where: { id: programId } });
  if (!program || program.deletedAt) throw AppError.notFound("Program");

  return withAudit(
    { actor, action: "applicationForm.manage", entityType: "ApplicationForm", ...ctx },
    async (tx) => {
      const existing = await tx.applicationForm.findFirst({ where: { programId } });
      const form = existing
        ? await tx.applicationForm.update({
            where: { id: existing.id },
            data: { name: data.name, active: data.active },
          })
        : await tx.applicationForm.create({
            data: { programId, name: data.name, active: data.active ?? true },
          });

      await tx.applicationFormField.deleteMany({ where: { formId: form.id } });
      if (data.fields.length > 0) {
        await tx.applicationFormField.createMany({
          data: data.fields.map((f) => ({
            formId: form.id,
            label: f.label,
            type: f.type,
            required: f.required ?? false,
            order: f.order,
            options: f.options ?? [],
            allowedFileTypes: f.allowedFileTypes ?? [],
            adminNote: f.adminNote ?? null,
          })),
        });
      }
      return tx.applicationForm.findUnique({
        where: { id: form.id },
        include: { fields: { orderBy: { order: "asc" } } },
      });
    },
  );
}
