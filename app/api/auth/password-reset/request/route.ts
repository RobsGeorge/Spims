import { NextRequest, NextResponse } from "next/server";
import { parseBody } from "@/lib/validation";
import { passwordResetRequestSchema } from "@/lib/validation/auth";
import { requestPasswordReset } from "@/lib/services/auth";
import { errorResponse } from "@/lib/errors";

export async function POST(req: NextRequest) {
  try {
    const { email } = await parseBody(req, passwordResetRequestSchema);
    await requestPasswordReset(email);
    // Always return 200 — don't reveal whether email exists
    return NextResponse.json({ ok: true });
  } catch (err) {
    return errorResponse(err);
  }
}
