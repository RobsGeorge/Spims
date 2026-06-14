import { NextRequest, NextResponse } from "next/server";
import { requireSession } from "@/lib/auth/session";
import { authorize } from "@/lib/auth/authorize";
import { parseBody, parseQuery, z } from "@/lib/validation";
import { createUserSchema } from "@/lib/validation/user";
import { listUsers, createUser } from "@/lib/services/user";
import { errorResponse } from "@/lib/errors";
import { UserStatus } from "@prisma/client";

const listQuerySchema = z.object({
  search: z.string().optional(),
  status: z.nativeEnum(UserStatus).optional(),
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20),
});

export async function GET(req: NextRequest) {
  try {
    const user = await requireSession();
    await authorize(user, "user.manage");
    const opts = parseQuery(req.nextUrl.searchParams, listQuerySchema);
    const result = await listUsers(opts);
    return NextResponse.json(result);
  } catch (err) {
    return errorResponse(err);
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await requireSession();
    await authorize(user, "user.manage");
    const data = await parseBody(req, createUserSchema);
    const ctx = {
      ip: req.headers.get("x-forwarded-for") ?? undefined,
      userAgent: req.headers.get("user-agent") ?? undefined,
      requestId: req.headers.get("x-request-id") ?? undefined,
    };
    const created = await createUser(user, data, ctx);
    return NextResponse.json({ user: created }, { status: 201 });
  } catch (err) {
    return errorResponse(err);
  }
}
