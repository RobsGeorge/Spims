import { NextRequest, NextResponse } from "next/server";
import { parseBody } from "@/lib/validation";
import { verifyOtpSchema } from "@/lib/validation/auth";
import { verifyOtp } from "@/lib/services/auth";
import { errorResponse } from "@/lib/errors";

export async function POST(req: NextRequest) {
  try {
    const { userId, code, purpose } = await parseBody(req, verifyOtpSchema);
    await verifyOtp(userId, code, purpose);
    return NextResponse.json({ ok: true });
  } catch (err) {
    return errorResponse(err);
  }
}
