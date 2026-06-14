import { NextRequest, NextResponse } from "next/server";
import { requireSession } from "@/lib/auth/session";
import { authorize } from "@/lib/auth/authorize";
import { parseBody } from "@/lib/validation";
import { triggerAiTranslationSchema } from "@/lib/validation/translation";
import { triggerAiTranslation } from "@/lib/services/translation";
import { errorResponse } from "@/lib/errors";

export async function POST(req: NextRequest) {
  try {
    const user = await requireSession();
    await authorize(user, "translation.aiTrigger");
    const data = await parseBody(req, triggerAiTranslationSchema);
    const ctx = {
      ip: req.headers.get("x-forwarded-for") ?? undefined,
      userAgent: req.headers.get("user-agent") ?? undefined,
      requestId: req.headers.get("x-request-id") ?? undefined,
    };
    const result = await triggerAiTranslation(user, data, ctx);
    return NextResponse.json(result);
  } catch (err) {
    return errorResponse(err);
  }
}
