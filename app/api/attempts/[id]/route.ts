import { NextRequest, NextResponse } from "next/server";
import { requireSession } from "@/lib/auth/session";
import { authorize } from "@/lib/auth/authorize";
import { getAttemptForStudent } from "@/lib/services/attempt";
import { errorResponse } from "@/lib/errors";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const user = await requireSession();
    const { id } = await params;
    await authorize(user, "assessment.take");
    const attempt = await getAttemptForStudent(id, user.id);
    return NextResponse.json({ attempt });
  } catch (err) {
    return errorResponse(err);
  }
}
