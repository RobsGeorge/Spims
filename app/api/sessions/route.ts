import { NextRequest, NextResponse } from "next/server";
import { requireSession } from "@/lib/auth/session";
import { authorize } from "@/lib/auth/authorize";
import { listAllSessions } from "@/lib/services/session";
import { errorResponse } from "@/lib/errors";

export async function GET(_req: NextRequest) {
  try {
    const user = await requireSession();
    await authorize(user, "session.schedule");
    const sessions = await listAllSessions();
    return NextResponse.json({ sessions });
  } catch (err) {
    return errorResponse(err);
  }
}
