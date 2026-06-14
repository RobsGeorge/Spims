import { NextRequest, NextResponse } from "next/server";
import { parseBody } from "@/lib/validation";
import { registerSchema } from "@/lib/validation/auth";
import { registerUser } from "@/lib/services/auth";
import { errorResponse } from "@/lib/errors";

export async function POST(req: NextRequest) {
  try {
    const data = await parseBody(req, registerSchema);
    const result = await registerUser(data);
    return NextResponse.json(result, { status: 201 });
  } catch (err) {
    return errorResponse(err);
  }
}
