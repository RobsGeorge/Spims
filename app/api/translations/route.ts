import { NextRequest, NextResponse } from "next/server";
import { requireSession } from "@/lib/auth/session";
import { authorize } from "@/lib/auth/authorize";
import { parseBody, parseQuery, z } from "@/lib/validation";
import { upsertTranslationSchema } from "@/lib/validation/translation";
import { getTranslations, upsertTranslation } from "@/lib/services/translation";
import { errorResponse } from "@/lib/errors";

const querySchema = z.object({
  entityType: z.string().min(1),
  entityId: z.string().min(1),
});

export async function GET(req: NextRequest) {
  try {
    await requireSession();
    const { entityType, entityId } = parseQuery(req.nextUrl.searchParams, querySchema);
    const translations = await getTranslations(entityType, entityId);
    return NextResponse.json({ translations });
  } catch (err) {
    return errorResponse(err);
  }
}

export async function PUT(req: NextRequest) {
  try {
    const user = await requireSession();
    await authorize(user, "translation.edit");
    const data = await parseBody(req, upsertTranslationSchema);
    const ctx = {
      ip: req.headers.get("x-forwarded-for") ?? undefined,
      userAgent: req.headers.get("user-agent") ?? undefined,
      requestId: req.headers.get("x-request-id") ?? undefined,
    };
    const translation = await upsertTranslation(user, data, ctx);
    return NextResponse.json({ translation });
  } catch (err) {
    return errorResponse(err);
  }
}
