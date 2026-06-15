import { NextRequest, NextResponse } from "next/server";
import type { GatewayProvider } from "@/lib/payments";
import { verifyWebhookSignature } from "@/lib/payments";
import { processWebhook } from "@/lib/services/payment";
import { errorResponse } from "@/lib/errors";

export async function handlePaymentWebhook(req: NextRequest, provider: GatewayProvider) {
  try {
    const raw = await req.text();
    const signature =
      req.headers.get("x-webhook-signature") ??
      req.headers.get("paypal-transmission-sig") ??
      req.headers.get("hmac");

    if (!verifyWebhookSignature(provider, raw, signature)) {
      return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
    }

    const payload = JSON.parse(raw || "{}") as Record<string, unknown>;
    const eventId = String(
      payload["id"] ??
        payload["event_id"] ??
        req.headers.get("x-request-id") ??
        raw.slice(0, 32),
    );
    const gatewayRef = String(payload["gatewayRef"] ?? payload["merchant_order_id"] ?? "");

    const result = await processWebhook(provider, eventId, payload, gatewayRef);
    return NextResponse.json(result);
  } catch (err) {
    return errorResponse(err);
  }
}
