import { NextRequest, NextResponse } from "next/server";
import { requireSession } from "@/lib/auth/session";
import { authorize } from "@/lib/auth/authorize";
import { parseBody } from "@/lib/validation";
import { createPostSchema } from "@/lib/validation/discussion";
import { createPost, listPosts } from "@/lib/services/discussion";
import { requestContext } from "@/lib/api/assessment-context";
import { errorResponse } from "@/lib/errors";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const user = await requireSession();
    const { id } = await params;
    await authorize(user, "discussion.post");
    const posts = await listPosts(id, user.id, user.roles);
    return NextResponse.json({ posts });
  } catch (err) {
    return errorResponse(err);
  }
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const user = await requireSession();
    const { id } = await params;
    await authorize(user, "discussion.post");
    const data = await parseBody(req, createPostSchema);
    const post = await createPost(user, id, data, requestContext(req));
    return NextResponse.json({ post }, { status: 201 });
  } catch (err) {
    return errorResponse(err);
  }
}
