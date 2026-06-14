import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth/session";
import { authorize } from "@/lib/auth/authorize";
import { errorResponse } from "@/lib/errors";

export async function GET(_req: NextRequest) {
  try {
    const user = await getSession();
    await authorize(user, "audit.readAll"); // SA-only action
    return NextResponse.json({ ok: true, userId: user?.id });
  } catch (err) {
    return errorResponse(err);
  }
}
