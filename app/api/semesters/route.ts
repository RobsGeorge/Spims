import { NextRequest, NextResponse } from "next/server";
import { requireSession } from "@/lib/auth/session";
import { authorize } from "@/lib/auth/authorize";
import { parseBody, parseQuery, z } from "@/lib/validation";
import { createSemesterSchema } from "@/lib/validation/semester";
import { listSemesters, createSemester } from "@/lib/services/semester";
import { errorResponse } from "@/lib/errors";

const listQuerySchema = z.object({
  academicYearId: z.string().optional(),
});

export async function GET(req: NextRequest) {
  try {
    const user = await requireSession();
    await authorize(user, "semester.read");
    const opts = parseQuery(req.nextUrl.searchParams, listQuerySchema);
    const semesters = await listSemesters(opts);
    return NextResponse.json({ semesters });
  } catch (err) {
    return errorResponse(err);
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await requireSession();
    await authorize(user, "semester.manage");
    const data = await parseBody(req, createSemesterSchema);
    const ctx = {
      ip: req.headers.get("x-forwarded-for") ?? undefined,
      userAgent: req.headers.get("user-agent") ?? undefined,
      requestId: req.headers.get("x-request-id") ?? undefined,
    };
    const semester = await createSemester(user, data, ctx);
    return NextResponse.json({ semester }, { status: 201 });
  } catch (err) {
    return errorResponse(err);
  }
}
