import { NextRequest, NextResponse } from "next/server";
import { requireSession } from "@/lib/auth/session";
import { authorize } from "@/lib/auth/authorize";
import { parseBody } from "@/lib/validation";
import { createGradingSchemeSchema } from "@/lib/validation/gradingScheme";
import { listGradingSchemes, createGradingScheme } from "@/lib/services/gradingScheme";
import { errorResponse } from "@/lib/errors";

export async function GET() {
  try {
    await requireSession();
    const schemes = await listGradingSchemes();
    return NextResponse.json({ schemes });
  } catch (err) {
    return errorResponse(err);
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await requireSession();
    await authorize(user, "gradingScheme.manage");
    const data = await parseBody(req, createGradingSchemeSchema);
    const ctx = {
      ip: req.headers.get("x-forwarded-for") ?? undefined,
      userAgent: req.headers.get("user-agent") ?? undefined,
      requestId: req.headers.get("x-request-id") ?? undefined,
    };
    const scheme = await createGradingScheme(user, data, ctx);
    return NextResponse.json({ scheme }, { status: 201 });
  } catch (err) {
    return errorResponse(err);
  }
}
