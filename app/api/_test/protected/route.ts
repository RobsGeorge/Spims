// Phase-0 smoke test: verifies that authorize() correctly blocks access.
// This route requires SUPER_ADMIN. Used in tests only.
import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth/session";
import { authorize } from "@/lib/auth/authorize";
import { errorResponse } from "@/lib/errors";

export async function GET(_req: NextRequest) {
  try {
    const user = await getSession();

    // requires "audit.readAll" which is SA-only (empty array in permission map)
    await authorize(user, "audit.readAll");

    return NextResponse.json({ ok: true, userId: user?.id });
  } catch (err) {
    return errorResponse(err);
  }
}
