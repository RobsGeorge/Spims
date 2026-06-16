import { NextRequest, NextResponse } from "next/server";
import { requireSession } from "@/lib/auth/session";
import { authorize } from "@/lib/auth/authorize";
import { parseBody } from "@/lib/validation";
import { updateSettingSchema } from "@/lib/validation/settings";
import { getSetting, isKnownSettingKey, putSetting } from "@/lib/services/settings";
import { requestContext } from "@/lib/api/assessment-context";
import { errorResponse, AppError } from "@/lib/errors";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ key: string }> },
) {
  try {
    const user = await requireSession();
    const { key } = await params;
    if (!isKnownSettingKey(key)) throw AppError.notFound("Setting");
    await authorize(user, "settings.manage");
    const setting = await getSetting(key);
    return NextResponse.json({ setting });
  } catch (err) {
    return errorResponse(err);
  }
}

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ key: string }> },
) {
  try {
    const user = await requireSession();
    const { key } = await params;
    if (!isKnownSettingKey(key)) throw AppError.notFound("Setting");
    await authorize(user, "settings.manage");
    const { value } = await parseBody(req, updateSettingSchema);
    const setting = await putSetting(user, key, value, requestContext(req));
    return NextResponse.json({ setting });
  } catch (err) {
    return errorResponse(err);
  }
}
