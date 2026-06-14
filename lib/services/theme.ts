import { db } from "@/lib/db";
import type { SessionUser } from "@/lib/auth/session";
import { withAudit } from "@/lib/audit";
import { AppError } from "@/lib/errors";

export async function listThemes() {
  return db.theme.findMany({ orderBy: { createdAt: "asc" } });
}

export async function getActiveTheme() {
  return db.theme.findFirst({ where: { isActive: true } });
}

export async function createTheme(
  actor: SessionUser,
  data: {
    name: string;
    siteName: string;
    logoLightUrl?: string | null;
    logoDarkUrl?: string | null;
    faviconUrl?: string | null;
    tokens: Record<string, string>;
  },
  ctx?: { ip?: string; userAgent?: string; requestId?: string },
) {
  return withAudit(
    { actor, action: "branding.manage", entityType: "Theme", ...ctx },
    async (tx) =>
      tx.theme.create({
        data: {
          name: data.name,
          siteName: data.siteName,
          logoLightUrl: data.logoLightUrl,
          logoDarkUrl: data.logoDarkUrl,
          faviconUrl: data.faviconUrl,
          tokens: data.tokens,
          updatedById: actor.id,
        },
      }),
  );
}

export async function updateTheme(
  actor: SessionUser,
  id: string,
  data: {
    name?: string;
    siteName?: string;
    logoLightUrl?: string | null;
    logoDarkUrl?: string | null;
    faviconUrl?: string | null;
    tokens?: Record<string, string>;
    isActive?: boolean;
  },
  ctx?: { ip?: string; userAgent?: string; requestId?: string },
) {
  const before = await db.theme.findUnique({ where: { id } });
  if (!before) throw AppError.notFound("Theme");

  return withAudit(
    {
      actor,
      action: "branding.manage",
      entityType: "Theme",
      entityId: id,
      before: { name: before.name, isActive: before.isActive },
      ...ctx,
    },
    async (tx) => {
      // If activating this theme, deactivate all others first
      if (data.isActive === true) {
        await tx.theme.updateMany({ where: { isActive: true }, data: { isActive: false } });
      }
      return tx.theme.update({
        where: { id },
        data: { ...data, updatedById: actor.id },
      });
    },
  );
}

export async function deleteTheme(
  actor: SessionUser,
  id: string,
  ctx?: { ip?: string; userAgent?: string; requestId?: string },
) {
  const theme = await db.theme.findUnique({ where: { id } });
  if (!theme) throw AppError.notFound("Theme");
  if (theme.isActive) throw AppError.conflict("Cannot delete the active theme");

  return withAudit(
    { actor, action: "branding.manage", entityType: "Theme", entityId: id, before: theme, ...ctx },
    async (tx) => tx.theme.delete({ where: { id } }),
  );
}
