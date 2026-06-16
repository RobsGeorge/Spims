import { NextRequest, NextResponse } from "next/server";
import { requireSession } from "@/lib/auth/session";
import { authorize } from "@/lib/auth/authorize";
import { listNotifications, markNotificationRead } from "@/lib/services/notification";
import { errorResponse } from "@/lib/errors";

export async function GET(req: NextRequest) {
  try {
    const user = await requireSession();
    await authorize(user, "profile.viewOwn");
    const unreadOnly = req.nextUrl.searchParams.get("unreadOnly") === "true";
    const notifications = await listNotifications(user.id, { unreadOnly });
    return NextResponse.json({ notifications });
  } catch (err) {
    return errorResponse(err);
  }
}
