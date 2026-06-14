import { NextRequest, NextResponse } from "next/server";
import { parseBody } from "@/lib/validation";
import { loginSchema } from "@/lib/validation/auth";
import { login } from "@/lib/services/auth";
import { setSessionCookie } from "@/lib/auth/session";
import { errorResponse } from "@/lib/errors";

export async function POST(req: NextRequest) {
  try {
    const { email, password } = await parseBody(req, loginSchema);
    const ctx = {
      ip: req.headers.get("x-forwarded-for") ?? undefined,
      userAgent: req.headers.get("user-agent") ?? undefined,
      requestId: req.headers.get("x-request-id") ?? undefined,
    };
    const { token, user } = await login(email, password, ctx);
    await setSessionCookie(token);
    return NextResponse.json({ user });
  } catch (err) {
    return errorResponse(err);
  }
}
