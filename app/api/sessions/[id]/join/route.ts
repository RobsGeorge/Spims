import { NextRequest, NextResponse } from "next/server";
import { requireSession } from "@/lib/auth/session";
import { authorize } from "@/lib/auth/authorize";
import { getSessionJoinUrl } from "@/lib/services/session";
import { errorResponse } from "@/lib/errors";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const user = await requireSession();
    const { id } = await params;
    await authorize(user, "session.join");
    const { joinUrl, session } = await getSessionJoinUrl(id, user.id, user.roles);
    return NextResponse.json({ joinUrl, session });
  } catch (err) {
    return errorResponse(err);
  }
}
