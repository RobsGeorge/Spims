import { NextRequest, NextResponse } from "next/server";
import { requireSession } from "@/lib/auth/session";
import { authorize } from "@/lib/auth/authorize";
import { parseBody, z } from "@/lib/validation";
import { upsertLanguage } from "@/lib/services/language";
import { errorResponse } from "@/lib/errors";

const patchLanguageSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  isRtl: z.boolean().optional(),
  enabled: z.boolean().optional(),
});

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ code: string }> }) {
  try {
    const user = await requireSession();
    await authorize(user, "language.manage");
    const { code } = await params;
    const data = await parseBody(req, patchLanguageSchema);
    const ctx = {
      ip: req.headers.get("x-forwarded-for") ?? undefined,
      userAgent: req.headers.get("user-agent") ?? undefined,
      requestId: req.headers.get("x-request-id") ?? undefined,
    };
    const language = await upsertLanguage(user, code, data, ctx);
    return NextResponse.json({ language });
  } catch (err) {
    return errorResponse(err);
  }
}
