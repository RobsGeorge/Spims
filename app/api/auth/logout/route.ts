import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth/session";
import { clearSessionCookie } from "@/lib/auth/session";
import { logout } from "@/lib/services/auth";
import { errorResponse } from "@/lib/errors";
import { cookies } from "next/headers";

export async function POST(req: NextRequest) {
  try {
    const user = await getSession();
    const cookieStore = await cookies();
    const token = cookieStore.get("spims_session")?.value;

    if (user && token) {
      const ctx = {
        ip: req.headers.get("x-forwarded-for") ?? undefined,
        userAgent: req.headers.get("user-agent") ?? undefined,
        requestId: req.headers.get("x-request-id") ?? undefined,
      };
      await logout(user, token, ctx);
    }

    await clearSessionCookie();
    return NextResponse.json({ ok: true });
  } catch (err) {
    return errorResponse(err);
  }
}
