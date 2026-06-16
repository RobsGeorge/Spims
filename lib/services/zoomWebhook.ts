import { db } from "@/lib/db";
import {
  extractMeetingId,
  extractParticipants,
  extractRecordingUrl,
} from "@/lib/zoom/webhook";
import type { ZoomWebhookEvent } from "@/lib/zoom/types";
import { linkSessionRecording } from "@/lib/services/session";
import { enqueueJob } from "@/lib/jobs/queue";

export async function processZoomWebhook(eventId: string, event: ZoomWebhookEvent) {
  const existing = await db.webhookEvent.findUnique({
    where: { provider_eventId: { provider: "zoom", eventId } },
  });
  if (existing) return { ok: true, duplicate: true };

  await db.webhookEvent.create({
    data: { provider: "zoom", eventId, payload: event as object },
  });

  const meetingId = extractMeetingId(event);
  if (!meetingId) return { ok: true };

  if (event.event.includes("recording")) {
    const url = extractRecordingUrl(event);
    if (url) await linkSessionRecording(meetingId, url);
  }

  if (
    event.event.includes("participant") ||
    event.event.includes("meeting.ended") ||
    event.event.includes("meeting.participant")
  ) {
    const participants = extractParticipants(event);
    const session = await db.liveSession.findFirst({ where: { zoomMeetingId: meetingId } });
    if (session) {
      if (participants.length > 0) {
        await enqueueJob("zoom-attendance-import", { sessionId: session.id, participants });
      }
    }
  }

  return { ok: true };
}
