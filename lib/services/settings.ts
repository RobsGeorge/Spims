import { db } from "@/lib/db";
import type { SessionUser } from "@/lib/auth/session";
import { withAudit } from "@/lib/audit";
import { AppError } from "@/lib/errors";
import type { SettingKey } from "@/lib/validation/settings";
import { validateSettingValue } from "@/lib/validation/settings";

const DEFAULTS: Record<SettingKey, unknown> = {
  "zoom.concurrent_hosts": 1,
};

export async function getSettingValue<T = unknown>(key: SettingKey): Promise<T | null> {
  const row = await db.setting.findUnique({ where: { key } });
  if (!row) return (DEFAULTS[key] as T) ?? null;
  return row.value as T;
}

export async function getSetting(key: SettingKey) {
  const value = await getSettingValue(key);
  return { key, value: value ?? DEFAULTS[key] };
}

export async function putSetting(
  actor: SessionUser,
  key: SettingKey,
  value: unknown,
  ctx?: { ip?: string; userAgent?: string; requestId?: string },
) {
  const validated = validateSettingValue(key, value);

  return withAudit(
    {
      actor,
      action: "settings.update",
      entityType: "Setting",
      entityId: key,
      after: { value: validated },
      ...ctx,
    },
    async (tx) =>
      tx.setting.upsert({
        where: { key },
        create: { key, value: validated as object, updatedById: actor.id },
        update: { value: validated as object, updatedById: actor.id },
      }),
  );
}

export function isKnownSettingKey(key: string): key is SettingKey {
  return key === "zoom.concurrent_hosts";
}
