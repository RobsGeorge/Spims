import { db } from "@/lib/db";
import type { SessionUser } from "@/lib/auth/session";
import { withAudit } from "@/lib/audit";
import { AppError } from "@/lib/errors";
import { translateText } from "@/lib/ai";
import { resolveTranslationSourceText } from "@/lib/services/translationSource";
import type { UpsertTranslationInput, VerifyTranslationInput, TriggerAiTranslationInput } from "@/lib/validation/translation";

export async function getTranslations(entityType: string, entityId: string) {
  return db.translation.findMany({
    where: { entityType, entityId },
    orderBy: [{ field: "asc" }, { locale: "asc" }],
  });
}

export async function upsertTranslation(
  actor: SessionUser,
  data: UpsertTranslationInput,
  ctx?: { ip?: string; userAgent?: string; requestId?: string },
) {
  return withAudit(
    {
      actor,
      action: "translation.edit",
      entityType: "Translation",
      before: { entityType: data.entityType, entityId: data.entityId, field: data.field, locale: data.locale },
      ...ctx,
    },
    async (tx) =>
      tx.translation.upsert({
        where: {
          entityType_entityId_field_locale: {
            entityType: data.entityType,
            entityId: data.entityId,
            field: data.field,
            locale: data.locale,
          },
        },
        create: {
          entityType: data.entityType,
          entityId: data.entityId,
          field: data.field,
          locale: data.locale,
          value: data.value,
          source: "HUMAN",
          verified: false,
          updatedById: actor.id,
        },
        update: {
          value: data.value,
          source: "HUMAN",
          verified: false,
          updatedById: actor.id,
        },
      }),
  );
}

export async function verifyTranslation(
  actor: SessionUser,
  input: VerifyTranslationInput,
  ctx?: { ip?: string; userAgent?: string; requestId?: string },
) {
  const translation = await db.translation.findUnique({ where: { id: input.translationId } });
  if (!translation) throw AppError.notFound("Translation");

  return withAudit(
    {
      actor,
      action: "translation.verify",
      entityType: "Translation",
      entityId: input.translationId,
      before: { verified: translation.verified },
      ...ctx,
    },
    async (tx) =>
      tx.translation.update({
        where: { id: input.translationId },
        data: { verified: true, source: "HUMAN", updatedById: actor.id },
      }),
  );
}

export async function triggerAiTranslation(
  actor: SessionUser,
  input: TriggerAiTranslationInput,
  ctx?: { ip?: string; userAgent?: string; requestId?: string },
) {
  const sourceText = await resolveTranslationSourceText(
    input.entityType,
    input.entityId,
    input.field,
  );

  const translated = await translateText(sourceText, input.locale);

  if (translated === null) {
    return { skipped: true };
  }

  await withAudit(
    {
      actor,
      action: "translation.aiTrigger",
      entityType: "Translation",
      before: { entityType: input.entityType, entityId: input.entityId, field: input.field, locale: input.locale },
      ...ctx,
    },
    async (tx) =>
      tx.translation.upsert({
        where: {
          entityType_entityId_field_locale: {
            entityType: input.entityType,
            entityId: input.entityId,
            field: input.field,
            locale: input.locale,
          },
        },
        create: {
          entityType: input.entityType,
          entityId: input.entityId,
          field: input.field,
          locale: input.locale,
          value: translated,
          source: "AI",
          verified: false,
          updatedById: actor.id,
        },
        update: {
          value: translated,
          source: "AI",
          verified: false,
          updatedById: actor.id,
        },
      }),
  );

  return { skipped: false };
}
