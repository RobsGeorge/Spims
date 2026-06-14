import { NextRequest, NextResponse } from "next/server";
import { requireSession } from "@/lib/auth/session";
import { authorize } from "@/lib/auth/authorize";
import { parseBody } from "@/lib/validation";
import { createTemplateSchema } from "@/lib/validation/assessmentTemplate";
import { listTemplates, createTemplate } from "@/lib/services/assessmentTemplate";
import { errorResponse } from "@/lib/errors";

export async function GET() {
  try {
    await requireSession();
    const templates = await listTemplates();
    return NextResponse.json({ templates });
  } catch (err) {
    return errorResponse(err);
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await requireSession();
    await authorize(user, "assessmentTemplate.manage");
    const data = await parseBody(req, createTemplateSchema);
    const ctx = {
      ip: req.headers.get("x-forwarded-for") ?? undefined,
      userAgent: req.headers.get("user-agent") ?? undefined,
      requestId: req.headers.get("x-request-id") ?? undefined,
    };
    const template = await createTemplate(user, data, ctx);
    return NextResponse.json({ template }, { status: 201 });
  } catch (err) {
    return errorResponse(err);
  }
}
