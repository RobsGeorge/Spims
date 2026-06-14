import { NextRequest, NextResponse } from "next/server";
import { parseBody } from "@/lib/validation";
import { passwordResetConfirmSchema } from "@/lib/validation/auth";
import { confirmPasswordReset } from "@/lib/services/auth";
import { errorResponse } from "@/lib/errors";

export async function POST(req: NextRequest) {
  try {
    const { email, code, newPassword } = await parseBody(req, passwordResetConfirmSchema);
    const ctx = {
      ip: req.headers.get("x-forwarded-for") ?? undefined,
      userAgent: req.headers.get("user-agent") ?? undefined,
      requestId: req.headers.get("x-request-id") ?? undefined,
    };
    await confirmPasswordReset(email, code, newPassword, ctx);
    return NextResponse.json({ ok: true });
  } catch (err) {
    return errorResponse(err);
  }
}
