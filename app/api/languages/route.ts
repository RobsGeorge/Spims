import { NextResponse } from "next/server";
import { listLanguages } from "@/lib/services/language";
import { errorResponse } from "@/lib/errors";

export async function GET() {
  try {
    const languages = await listLanguages();
    return NextResponse.json({ languages });
  } catch (err) {
    return errorResponse(err);
  }
}
