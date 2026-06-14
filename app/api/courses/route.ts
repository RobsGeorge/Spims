import { NextRequest, NextResponse } from "next/server";
import { requireSession } from "@/lib/auth/session";
import { authorize } from "@/lib/auth/authorize";
import { parseBody, parseQuery, z } from "@/lib/validation";
import { createCourseSchema } from "@/lib/validation/course";
import { listCourses, createCourse } from "@/lib/services/course";
import { errorResponse } from "@/lib/errors";

const listQuerySchema = z.object({
  search: z.string().optional(),
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20),
});

export async function GET(req: NextRequest) {
  try {
    const user = await requireSession();
    await authorize(user, "course.read");
    const opts = parseQuery(req.nextUrl.searchParams, listQuerySchema);
    const result = await listCourses(opts);
    return NextResponse.json(result);
  } catch (err) {
    return errorResponse(err);
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await requireSession();
    await authorize(user, "course.manage");
    const data = await parseBody(req, createCourseSchema);
    const ctx = {
      ip: req.headers.get("x-forwarded-for") ?? undefined,
      userAgent: req.headers.get("user-agent") ?? undefined,
      requestId: req.headers.get("x-request-id") ?? undefined,
    };
    const course = await createCourse(user, data, ctx);
    return NextResponse.json({ course }, { status: 201 });
  } catch (err) {
    return errorResponse(err);
  }
}
