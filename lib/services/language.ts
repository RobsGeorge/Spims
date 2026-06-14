import { db } from "@/lib/db";
import type { SessionUser } from "@/lib/auth/session";
import { withAudit } from "@/lib/audit";

export async function listLanguages() {
  return db.language.findMany({ orderBy: { code: "asc" } });
}

export async function upsertLanguage(
  actor: SessionUser,
  code: string,
  data: { name?: string; isRtl?: boolean; enabled?: boolean },
  ctx?: { ip?: string; userAgent?: string; requestId?: string },
) {
  return withAudit(
    { actor, action: "language.manage", entityType: "Language", entityId: code, ...ctx },
    async (tx) =>
      tx.language.upsert({
        where: { code },
        create: {
          code,
          name: data.name ?? code,
          isRtl: data.isRtl ?? false,
          enabled: data.enabled ?? true,
        },
        update: {
          ...(data.name !== undefined && { name: data.name }),
          ...(data.isRtl !== undefined && { isRtl: data.isRtl }),
          ...(data.enabled !== undefined && { enabled: data.enabled }),
        },
      }),
  );
}
