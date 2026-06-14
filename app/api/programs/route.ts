import { NextRequest, NextResponse } from "next/server";
import { requireSession } from "@/lib/auth/session";
import { authorize } from "@/lib/auth/authorize";
import { parseBody, parseQuery, z } from "@/lib/validation";
import { createProgramSchema } from "@/lib/validation/program";
import { listPrograms, createProgram } from "@/lib/services/program";
import { errorResponse } from "@/lib/errors";

const listQuerySchema = z.object({
  search: z.string().optional(),
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20),
});

export async function GET(req: NextRequest) {
  try {
    const user = await requireSession();
    await authorize(user, "program.read");
    const opts = parseQuery(req.nextUrl.searchParams, listQuerySchema);
    const result = await listPrograms(opts);
    return NextResponse.json(result);
  } catch (err) {
    return errorResponse(err);
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await requireSession();
    await authorize(user, "program.manage");
    const data = await parseBody(req, createProgramSchema);
    const ctx = {
      ip: req.headers.get("x-forwarded-for") ?? undefined,
      userAgent: req.headers.get("user-agent") ?? undefined,
      requestId: req.headers.get("x-request-id") ?? undefined,
    };
    const program = await createProgram(user, data, ctx);
    return NextResponse.json({ program }, { status: 201 });
  } catch (err) {
    return errorResponse(err);
  }
}
