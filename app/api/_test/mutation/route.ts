// Phase-0 smoke test: verifies that withAudit() writes an AuditLog row.
// Requires SUPER_ADMIN session.
import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth/session";
import { authorize } from "@/lib/auth/authorize";
import { withAudit } from "@/lib/audit";
import { errorResponse } from "@/lib/errors";

export async function POST(req: NextRequest) {
  try {
    const user = await getSession();
    await authorize(user, "audit.readAll");

    const requestId = req.headers.get("x-request-id") ?? undefined;

    const log = await withAudit(
      {
        actor: user,
        action: "test.mutation",
        entityType: "TestEntity",
        entityId: "phase-0-test",
        after: { phase: 0, test: true },
        ip: req.headers.get("x-forwarded-for") ?? undefined,
        userAgent: req.headers.get("user-agent") ?? undefined,
        requestId,
      },
      async (_tx) => {
        // No real mutation — just the audit log write
        return { written: true };
      },
    );

    return NextResponse.json({ ok: true, result: log });
  } catch (err) {
    return errorResponse(err);
  }
}
