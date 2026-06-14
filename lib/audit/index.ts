import { db } from "@/lib/db";
import type { SessionUser } from "@/lib/auth/session";
import type { PrismaClient } from "@prisma/client";

export interface AuditContext {
  actor: SessionUser | null;
  action: string;          // e.g. "application.accept", "grade.lock"
  entityType?: string;     // e.g. "Application", "Enrollment"
  entityId?: string;
  before?: unknown;
  after?: unknown;
  ip?: string;
  userAgent?: string;
  requestId?: string;
}

type TxClient = Parameters<Parameters<PrismaClient["$transaction"]>[0]>[0];

/**
 * Write an AuditLog entry.
 * Call this inside a transaction via withAudit(), or standalone for reads.
 */
export async function writeAuditLog(
  ctx: AuditContext,
  tx?: TxClient,
): Promise<void> {
  const client = tx ?? db;
  await client.auditLog.create({
    data: {
      actorId: ctx.actor?.id ?? null,
      actorRole: ctx.actor?.roles.join(",") ?? null,
      action: ctx.action,
      entityType: ctx.entityType ?? null,
      entityId: ctx.entityId ?? null,
      before: ctx.before !== undefined ? (ctx.before as object) : undefined,
      after: ctx.after !== undefined ? (ctx.after as object) : undefined,
      ip: ctx.ip ?? null,
      userAgent: ctx.userAgent ?? null,
      requestId: ctx.requestId ?? null,
    },
  });
}

/**
 * Wrap a mutation inside a DB transaction that also writes an AuditLog entry.
 *
 * Usage:
 *   const result = await withAudit(
 *     { actor: user, action: "enrollment.create", entityType: "Enrollment" },
 *     async (tx) => {
 *       const enr = await tx.enrollment.create({ ... });
 *       return enr;
 *     }
 *   );
 */
export async function withAudit<T>(
  ctx: AuditContext,
  mutation: (tx: TxClient) => Promise<T>,
): Promise<T> {
  return db.$transaction(async (tx) => {
    const result = await mutation(tx);

    // Capture entityId from the result if not pre-set
    const entityId =
      ctx.entityId ??
      (result && typeof result === "object" && "id" in result
        ? String((result as Record<string, unknown>)["id"])
        : undefined);

    await writeAuditLog({ ...ctx, entityId }, tx);

    return result;
  });
}
