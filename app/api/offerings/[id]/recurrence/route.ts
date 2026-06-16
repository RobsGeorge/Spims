import { NextRequest, NextResponse } from "next/server";
import { requireSession } from "@/lib/auth/session";
import { authorize } from "@/lib/auth/authorize";
import { parseBody } from "@/lib/validation";
import { createRecurrenceSchema } from "@/lib/validation/session";
import { createRecurrenceAndSessions } from "@/lib/services/session";
import { requestContext } from "@/lib/api/assessment-context";
import { errorResponse } from "@/lib/errors";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const user = await requireSession();
    const { id } = await params;
    await authorize(user, "session.schedule");
    const data = await parseBody(req, createRecurrenceSchema);
    const sessions = await createRecurrenceAndSessions(user, id, data, requestContext(req));
    return NextResponse.json({ sessions }, { status: 201 });
  } catch (err) {
    return errorResponse(err);
  }
}
