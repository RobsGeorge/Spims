import { createHmac, timingSafeEqual } from "crypto";
import type { ZoomWebhookEvent } from "@/lib/zoom/types";

export function verifyZoomWebhookSignature(
  rawBody: string,
  signature: string | null,
  timestamp: string | null,
): boolean {
  const secret = process.env["ZOOM_WEBHOOK_SECRET"];
  if (!secret) return true;
  if (!signature || !timestamp) return false;

  const message = `v0:${timestamp}:${rawBody}`;
  const hash = createHmac("sha256", secret).update(message).digest("hex");
  const expected = `v0=${hash}`;

  try {
    return timingSafeEqual(Buffer.from(expected), Buffer.from(signature));
  } catch {
    return false;
  }
}

export function parseZoomWebhook(raw: string): ZoomWebhookEvent {
  return JSON.parse(raw || "{}") as ZoomWebhookEvent;
}

export function extractRecordingUrl(event: ZoomWebhookEvent): string | null {
  const files = event.payload?.object?.recording_files ?? [];
  const file = files.find((f) => f.play_url || f.download_url);
  return file?.play_url ?? file?.download_url ?? null;
}

export function extractParticipants(event: ZoomWebhookEvent): Array<{ email: string; durationMinutes: number }> {
  const obj = event.payload?.object;
  if (obj?.participants?.length) {
    return obj.participants.map((p) => ({
      email: (p.user_email ?? p.email ?? "").toLowerCase(),
      durationMinutes: Math.round((p.duration ?? 0) / 60),
    }));
  }
  if (obj?.participant?.email) {
    return [
      {
        email: obj.participant.email.toLowerCase(),
        durationMinutes: Math.round((obj.participant.duration ?? 0) / 60),
      },
    ];
  }
  return [];
}

export function extractMeetingId(event: ZoomWebhookEvent): string | null {
  const id = event.payload?.object?.id;
  return id != null ? String(id) : null;
}
