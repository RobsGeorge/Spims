import { NextRequest, NextResponse } from "next/server";
import { RoleType } from "@prisma/client";
import { requireSession } from "@/lib/auth/session";
import { authorize } from "@/lib/auth/authorize";
import { parseBody, parseQuery, z } from "@/lib/validation";
import { createOfferingSchema } from "@/lib/validation/offering";
import { listOfferings, createOffering } from "@/lib/services/offering";
import { errorResponse } from "@/lib/errors";

const listQuerySchema = z.object({
  courseId: z.string().optional(),
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20),
});

export async function GET(req: NextRequest) {
  try {
    const user = await requireSession();
    const isAca =
      user.roles.includes(RoleType.ACADEMIC_ADMIN) ||
      user.roles.includes(RoleType.SUPER_ADMIN);
    if (isAca) {
      await authorize(user, "offering.manage");
    } else {
      await authorize(user, "offering.editContent");
    }
    const opts = parseQuery(req.nextUrl.searchParams, listQuerySchema);
    const result = await listOfferings(user, opts);
    return NextResponse.json(result);
  } catch (err) {
    return errorResponse(err);
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await requireSession();
    await authorize(user, "offering.manage");
    const data = await parseBody(req, createOfferingSchema);
    const ctx = {
      ip: req.headers.get("x-forwarded-for") ?? undefined,
      userAgent: req.headers.get("user-agent") ?? undefined,
      requestId: req.headers.get("x-request-id") ?? undefined,
    };
    const offering = await createOffering(user, data, ctx);
    return NextResponse.json({ offering }, { status: 201 });
  } catch (err) {
    return errorResponse(err);
  }
}
