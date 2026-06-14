import { NextRequest, NextResponse } from "next/server";
import { requireSession } from "@/lib/auth/session";
import { authorize } from "@/lib/auth/authorize";
import { parseBody } from "@/lib/validation";
import { updateCourseSchema } from "@/lib/validation/course";
import { getCourseById, updateCourse, deleteCourse } from "@/lib/services/course";
import { errorResponse } from "@/lib/errors";

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireSession();
    await authorize(user, "course.read");
    const { id } = await params;
    const course = await getCourseById(id);
    return NextResponse.json({ course });
  } catch (err) {
    return errorResponse(err);
  }
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireSession();
    await authorize(user, "course.manage");
    const { id } = await params;
    const data = await parseBody(req, updateCourseSchema);
    const ctx = {
      ip: req.headers.get("x-forwarded-for") ?? undefined,
      userAgent: req.headers.get("user-agent") ?? undefined,
      requestId: req.headers.get("x-request-id") ?? undefined,
    };
    const course = await updateCourse(user, id, data, ctx);
    return NextResponse.json({ course });
  } catch (err) {
    return errorResponse(err);
  }
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireSession();
    await authorize(user, "course.manage");
    const { id } = await params;
    await deleteCourse(user, id, {});
    return NextResponse.json({ ok: true });
  } catch (err) {
    return errorResponse(err);
  }
}
