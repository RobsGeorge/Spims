import { NextRequest, NextResponse } from "next/server";
import { verifyZoomWebhookSignature, parseZoomWebhook } from "@/lib/zoom/webhook";
import { processZoomWebhook } from "@/lib/services/zoomWebhook";
import { errorResponse } from "@/lib/errors";

export async function POST(req: NextRequest) {
  try {
    const raw = await req.text();
    const signature = req.headers.get("x-zm-signature");
    const timestamp = req.headers.get("x-zm-request-timestamp");

    if (!verifyZoomWebhookSignature(raw, signature, timestamp)) {
      return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
    }

    const event = parseZoomWebhook(raw);
    const eventId = String(req.headers.get("x-zm-trackingid") ?? event.event ?? raw.slice(0, 32));
    const result = await processZoomWebhook(eventId, event);
    return NextResponse.json(result);
  } catch (err) {
    return errorResponse(err);
  }
}
