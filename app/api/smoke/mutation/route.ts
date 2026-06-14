import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth/session";
import { authorize } from "@/lib/auth/authorize";
import { withAudit } from "@/lib/audit";
import { errorResponse } from "@/lib/errors";

export async function POST(req: NextRequest) {
  try {
    const user = await getSession();
    await authorize(user, "audit.readAll"); // SA-only

    const requestId = req.headers.get("x-request-id") ?? undefined;

    const result = await withAudit(
      {
        actor: user,
        action: "test.mutation",
        entityType: "TestEntity",
        entityId: "phase-0-smoke",
        after: { phase: 0, test: true },
        ip: req.headers.get("x-forwarded-for") ?? undefined,
        userAgent: req.headers.get("user-agent") ?? undefined,
        requestId,
      },
      async (_tx) => ({ written: true }),
    );

    return NextResponse.json({ ok: true, result });
  } catch (err) {
    return errorResponse(err);
  }
}
