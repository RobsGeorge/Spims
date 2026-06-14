import { NextRequest, NextResponse } from "next/server";
import { requireSession } from "@/lib/auth/session";
import { authorize } from "@/lib/auth/authorize";
import { parseBody } from "@/lib/validation";
import { createAcademicYearSchema } from "@/lib/validation/academicYear";
import { listAcademicYears, createAcademicYear } from "@/lib/services/academicYear";
import { errorResponse } from "@/lib/errors";

export async function GET() {
  try {
    const user = await requireSession();
    await authorize(user, "semester.read");
    const years = await listAcademicYears();
    return NextResponse.json({ years });
  } catch (err) {
    return errorResponse(err);
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await requireSession();
    await authorize(user, "semester.manage");
    const data = await parseBody(req, createAcademicYearSchema);
    const ctx = {
      ip: req.headers.get("x-forwarded-for") ?? undefined,
      userAgent: req.headers.get("user-agent") ?? undefined,
      requestId: req.headers.get("x-request-id") ?? undefined,
    };
    const year = await createAcademicYear(user, data, ctx);
    return NextResponse.json({ year }, { status: 201 });
  } catch (err) {
    return errorResponse(err);
  }
}
