export type ZoomMeeting = {
  id: string;
  join_url: string;
  start_url: string;
};

export type ZoomParticipant = {
  email: string;
  durationMinutes: number;
};

export type ZoomWebhookEvent = {
  event: string;
  payload: {
    object?: {
      id?: string | number;
      uuid?: string;
      topic?: string;
      recording_files?: Array<{ download_url?: string; play_url?: string }>;
      participant?: { email?: string; duration?: number };
      participants?: Array<{ user_email?: string; email?: string; duration?: number }>;
    };
  };
};
