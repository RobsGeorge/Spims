import { NextRequest, NextResponse } from "next/server";
import { FormFieldType } from "@prisma/client";
import { requireSession } from "@/lib/auth/session";
import { authorize } from "@/lib/auth/authorize";
import { parseBody } from "@/lib/validation";
import { applicationUploadUrlSchema } from "@/lib/validation/application";
import { db } from "@/lib/db";
import { createPresignedUploadUrl } from "@/lib/storage";
import { AppError, errorResponse } from "@/lib/errors";

function extensionAllowed(filename: string, allowed: string[]): boolean {
  if (allowed.length === 0) return true;
  const ext = filename.split(".").pop()?.toLowerCase() ?? "";
  return allowed.some((a) => a.replace(/^\./, "").toLowerCase() === ext);
}

export async function POST(req: NextRequest) {
  try {
    const user = await requireSession();
    await authorize(user, "application.submit");
    const data = await parseBody(req, applicationUploadUrlSchema);

    const field = await db.applicationFormField.findFirst({
      where: {
        id: data.fieldId,
        type: FormFieldType.FILE,
        form: { programId: data.programId, active: true },
      },
    });
    if (!field) throw AppError.notFound("Application file field");

    if (!extensionAllowed(data.filename, field.allowedFileTypes)) {
      throw AppError.validation("File type not allowed for this field");
    }

    const result = await createPresignedUploadUrl({
      keyPrefix: `applications/${data.programId}/${user.id}`,
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
