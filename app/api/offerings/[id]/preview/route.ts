import { NextResponse } from "next/server";
import { getOfferingPreview } from "@/lib/services/offering";
import { errorResponse } from "@/lib/errors";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const preview = await getOfferingPreview(id);
    return NextResponse.json(preview);
  } catch (err) {
    return errorResponse(err);
  }
}
