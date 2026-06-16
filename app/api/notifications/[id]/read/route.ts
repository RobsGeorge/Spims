import { NextRequest, NextResponse } from "next/server";
import { requireSession } from "@/lib/auth/session";
import { authorize } from "@/lib/auth/authorize";
import { markNotificationRead } from "@/lib/services/notification";
import { errorResponse } from "@/lib/errors";

export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const user = await requireSession();
    const { id } = await params;
    await authorize(user, "profile.viewOwn");
    const notification = await markNotificationRead(user.id, id);
    if (!notification) return NextResponse.json({ error: "Not found" }, { status: 404 });
    return NextResponse.json({ notification });
  } catch (err) {
    return errorResponse(err);
  }
}
