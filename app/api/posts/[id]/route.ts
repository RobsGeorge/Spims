import { NextRequest, NextResponse } from "next/server";
import { requireSession } from "@/lib/auth/session";
import { authorize } from "@/lib/auth/authorize";
import { parseBody } from "@/lib/validation";
import { updatePostSchema } from "@/lib/validation/discussion";
import { deletePost, updatePost } from "@/lib/services/discussion";
import { requestContext } from "@/lib/api/assessment-context";
import { errorResponse } from "@/lib/errors";

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const user = await requireSession();
    const { id } = await params;
    await authorize(user, "discussion.post");
    const data = await parseBody(req, updatePostSchema);
    const post = await updatePost(user, id, data, requestContext(req));
    return NextResponse.json({ post });
  } catch (err) {
    return errorResponse(err);
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const user = await requireSession();
    const { id } = await params;
    await authorize(user, "discussion.post");
    const post = await deletePost(user, id, requestContext(req));
    return NextResponse.json({ post });
  } catch (err) {
    return errorResponse(err);
  }
}
