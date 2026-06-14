import { NextRequest, NextResponse } from "next/server";
import { requireSession } from "@/lib/auth/session";
import { authorize } from "@/lib/auth/authorize";
import { parseBody } from "@/lib/validation";
import { uploadUrlSchema } from "@/lib/validation/storage";
import { createPresignedUploadUrl } from "@/lib/storage";
import { assertOfferingContentAccess } from "@/lib/services/offeringScope";
import { errorResponse } from "@/lib/errors";

export async function POST(req: NextRequest) {
  try {
    const user = await requireSession();
    await authorize(user, "offering.editContent");
    const data = await parseBody(req, uploadUrlSchema);
    await assertOfferingContentAccess(user.id, data.offeringId, user.roles);

    const result = await createPresignedUploadUrl({
      keyPrefix: `offerings/${data.offeringId}`,
      filename: data.filename,
      contentType: data.contentType,
    });

    if (!result) {
      return NextResponse.json(
        { configured: false, message: "Object storage is not configured" },
        { status: 503 },
      );
    }

    return NextResponse.json({ configured: true, ...result });
  } catch (err) {
    return errorResponse(err);
  }
}
