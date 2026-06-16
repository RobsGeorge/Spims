import type { ZoomMeeting, ZoomParticipant } from "@/lib/zoom/types";

let cachedToken: { token: string; expiresAt: number } | null = null;

export function isZoomConfigured(): boolean {
  return Boolean(
    process.env["ZOOM_ACCOUNT_ID"] &&
      process.env["ZOOM_CLIENT_ID"] &&
      process.env["ZOOM_CLIENT_SECRET"],
  );
}

export async function getAccessToken(): Promise<string | null> {
  if (!isZoomConfigured()) return null;

  const now = Date.now();
  if (cachedToken && cachedToken.expiresAt > now + 60_000) {
    return cachedToken.token;
  }

  const accountId = process.env["ZOOM_ACCOUNT_ID"]!;
  const clientId = process.env["ZOOM_CLIENT_ID"]!;
  const clientSecret = process.env["ZOOM_CLIENT_SECRET"]!;
  const basic = Buffer.from(`${clientId}:${clientSecret}`).toString("base64");

  const res = await fetch(`https://zoom.us/oauth/token?grant_type=account_credentials&account_id=${accountId}`, {
    method: "POST",
    headers: { Authorization: `Basic ${basic}` },
  });

  if (!res.ok) return null;
  const data = (await res.json()) as { access_token: string; expires_in: number };
  cachedToken = { token: data.access_token, expiresAt: now + data.expires_in * 1000 };
  return data.access_token;
}

export async function createZoomMeeting(params: {
  topic: string;
  startTime: Date;
  durationMinutes: number;
}): Promise<ZoomMeeting> {
  if (!isZoomConfigured()) {
    const id = `mock-${Date.now()}`;
    return {
      id,
      join_url: `https://zoom.us/j/${id}`,
      start_url: `https://zoom.us/s/${id}`,
    };
  }

  const token = await getAccessToken();
  if (!token) {
    const id = `mock-${Date.now()}`;
    return {
      id,
      join_url: `https://zoom.us/j/${id}`,
      start_url: `https://zoom.us/s/${id}`,
    };
  }

  const res = await fetch("https://api.zoom.us/v2/users/me/meetings", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      topic: params.topic,
      type: 2,
      start_time: params.startTime.toISOString(),
      duration: params.durationMinutes,
      settings: { join_before_host: true, waiting_room: false },
    }),
  });

  if (!res.ok) {
    const id = `mock-${Date.now()}`;
    return {
      id,
      join_url: `https://zoom.us/j/${id}`,
      start_url: `https://zoom.us/s/${id}`,
    };
  }

  const data = (await res.json()) as { id: number | string; join_url: string; start_url: string };
  return {
    id: String(data.id),
    join_url: data.join_url,
    start_url: data.start_url,
  };
}

export async function getParticipantReport(meetingId: string): Promise<ZoomParticipant[]> {
  if (!isZoomConfigured()) return [];

  const token = await getAccessToken();
  if (!token) return [];

  const res = await fetch(
    `https://api.zoom.us/v2/report/meetings/${encodeURIComponent(meetingId)}/participants?page_size=300`,
    { headers: { Authorization: `Bearer ${token}` } },
  );
  if (!res.ok) return [];

  const data = (await res.json()) as {
    participants?: Array<{ user_email?: string; email?: string; duration?: number }>;
  };

  return (data.participants ?? []).map((p) => ({
    email: (p.user_email ?? p.email ?? "").toLowerCase(),
    durationMinutes: Math.round((p.duration ?? 0) / 60),
  }));
}
