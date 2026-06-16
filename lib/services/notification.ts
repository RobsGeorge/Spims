import { NotificationChannel, Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import { enqueueJob } from "@/lib/jobs/queue";

export type NotifyInput = {
  type: string;
  title: string;
  body: string;
  metadata?: Record<string, unknown>;
  sendEmail?: boolean;
};

export async function notifyUser(userId: string, input: NotifyInput) {
  const notification = await db.notification.create({
    data: {
      userId,
      type: input.type,
      title: input.title,
      body: input.body,
      channel: NotificationChannel.IN_APP,
      metadata: (input.metadata ?? undefined) as Prisma.InputJsonValue | undefined,
    },
  });

  if (input.sendEmail !== false) {
    await enqueueJob("notification-dispatch", { notificationId: notification.id });
  }

  return notification;
}

export async function listNotifications(userId: string, opts: { unreadOnly?: boolean; limit?: number } = {}) {
  const { unreadOnly = false, limit = 50 } = opts;
  return db.notification.findMany({
    where: {
      userId,
      ...(unreadOnly ? { readAt: null } : {}),
    },
    orderBy: { createdAt: "desc" },
    take: limit,
  });
}

export async function markNotificationRead(userId: string, notificationId: string) {
  const row = await db.notification.findFirst({
    where: { id: notificationId, userId },
  });
  if (!row) return null;
  return db.notification.update({
    where: { id: notificationId },
    data: { readAt: new Date() },
  });
}

export async function countUnreadNotifications(userId: string) {
  return db.notification.count({ where: { userId, readAt: null } });
}

export async function dispatchNotificationEmail(notificationId: string) {
  const notification = await db.notification.findUnique({
    where: { id: notificationId },
    include: { user: { select: { email: true, preferredLocale: true } } },
  });
  if (!notification) return;

  const { sendNotificationEmail } = await import("@/lib/email");
  await sendNotificationEmail(notification.user.email, notification.title, notification.body);
}

export async function notifyEnrollment(userId: string, courseTitle: string) {
  return notifyUser(userId, {
    type: "ENROLLMENT",
    title: "Enrollment confirmed",
    body: `You are enrolled in ${courseTitle}.`,
  });
}

export async function notifyWaitlistPromotion(userId: string, courseTitle: string) {
  return notifyUser(userId, {
    type: "WAITLIST_PROMOTION",
    title: "Waitlist promotion",
    body: `A seat opened in ${courseTitle} — you are now enrolled.`,
  });
}

export async function notifyGradeRelease(userId: string, courseTitle: string, letter: string) {
  return notifyUser(userId, {
    type: "GRADE_RELEASE",
    title: "Grades released",
    body: `Final grade for ${courseTitle}: ${letter}`,
  });
}

export async function notifyPaymentReceipt(userId: string, amountLabel: string) {
  return notifyUser(userId, {
    type: "PAYMENT_RECEIPT",
    title: "Payment receipt",
    body: `Your payment of ${amountLabel} was received.`,
  });
}

export async function notifyApplicationDecision(userId: string, programName: string, decision: string) {
  return notifyUser(userId, {
    type: "APPLICATION_DECISION",
    title: "Application decision",
    body: `Your application to ${programName}: ${decision}`,
  });
}

export async function notifySessionReminder(
  userId: string,
  sessionTitle: string,
  when: "24h" | "15m",
) {
  const label = when === "24h" ? "24 hours" : "15 minutes";
  return notifyUser(userId, {
    type: when === "24h" ? "SESSION_REMINDER_24H" : "SESSION_REMINDER_15M",
    title: "Live session reminder",
    body: `${sessionTitle} starts in ${label}.`,
  });
}

export async function notifyDiscussionReply(
  userId: string,
  threadTitle: string,
  authorName: string,
) {
  return notifyUser(userId, {
    type: "DISCUSSION_REPLY",
    title: "New discussion reply",
    body: `${authorName} replied in "${threadTitle}".`,
  });
}
