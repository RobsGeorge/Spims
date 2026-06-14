import { NextRequest, NextResponse } from "next/server";
import { requireSession } from "@/lib/auth/session";
import { authorize } from "@/lib/auth/authorize";
import { parseBody } from "@/lib/validation";
import { verifyTranslationSchema } from "@/lib/validation/translation";
import { verifyTranslation } from "@/lib/services/translation";
import { errorResponse } from "@/lib/errors";

export async function POST(req: NextRequest) {
  try {
    const user = await requireSession();
    await authorize(user, "translation.verify");
    const data = await parseBody(req, verifyTranslationSchema);
    const ctx = {
      ip: req.headers.get("x-forwarded-for") ?? undefined,
      userAgent: req.headers.get("user-agent") ?? undefined,
      requestId: req.headers.get("x-request-id") ?? undefined,
    };
    const translation = await verifyTranslation(user, data, ctx);
    return NextResponse.json({ translation });
  } catch (err) {
    return errorResponse(err);
  }
}
