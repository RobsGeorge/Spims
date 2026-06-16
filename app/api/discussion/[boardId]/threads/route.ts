import { NextRequest, NextResponse } from "next/server";
import { requireSession } from "@/lib/auth/session";
import { authorize } from "@/lib/auth/authorize";
import { parseBody } from "@/lib/validation";
import { createThreadSchema } from "@/lib/validation/discussion";
import { createThread, listThreads } from "@/lib/services/discussion";
import { requestContext } from "@/lib/api/assessment-context";
import { errorResponse } from "@/lib/errors";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ boardId: string }> },
) {
  try {
    const user = await requireSession();
    const { boardId } = await params;
    await authorize(user, "discussion.post");
    const threads = await listThreads(boardId, user.id, user.roles);
    return NextResponse.json({ threads });
  } catch (err) {
    return errorResponse(err);
  }
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ boardId: string }> },
) {
  try {
    const user = await requireSession();
    const { boardId } = await params;
    await authorize(user, "discussion.post");
    const data = await parseBody(req, createThreadSchema);
    const thread = await createThread(user, boardId, data, requestContext(req));
    return NextResponse.json({ thread }, { status: 201 });
  } catch (err) {
    return errorResponse(err);
  }
}
