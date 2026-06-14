import { NextRequest, NextResponse } from "next/server";
import { parseBody } from "@/lib/validation";
import { setPasswordSchema } from "@/lib/validation/auth";
import { setPassword } from "@/lib/services/auth";
import { setSessionCookie } from "@/lib/auth/session";
import { errorResponse } from "@/lib/errors";

export async function POST(req: NextRequest) {
  try {
    const { userId, password } = await parseBody(req, setPasswordSchema);
    const ctx = {
      ip: req.headers.get("x-forwarded-for") ?? undefined,
      userAgent: req.headers.get("user-agent") ?? undefined,
      requestId: req.headers.get("x-request-id") ?? undefined,
    };
    const token = await setPassword(userId, password, ctx);
    await setSessionCookie(token);
    return NextResponse.json({ ok: true });
  } catch (err) {
    return errorResponse(err);
  }
}
