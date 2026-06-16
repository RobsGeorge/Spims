/** Shared BullMQ job processor — used by the worker and inline fallback. */
export async function processJob(name: string, data: Record<string, unknown>) {
  if (name === "receipt-pdf" && typeof data.paymentId === "string") {
    const { finalizePaymentReceipt } = await import("@/lib/services/receipt");
    await finalizePaymentReceipt(data.paymentId);
    return;
  }
  if (name === "attempt-auto-submit" && typeof data.attemptId === "string") {
    const { autoSubmitDueAttempt, processDueAttempts } = await import("@/lib/services/attempt");
    await autoSubmitDueAttempt(data.attemptId);
    await processDueAttempts();
    return;
  }
  if (name === "ai-essay-grade" && typeof data.attemptId === "string") {
    const { runAiEssayGrading } = await import("@/lib/services/attempt");
    await runAiEssayGrading(data.attemptId);
    return;
  }
  if (name === "notification-dispatch" && typeof data.notificationId === "string") {
    const { dispatchNotificationEmail } = await import("@/lib/services/notification");
    await dispatchNotificationEmail(data.notificationId);
    return;
  }
  if (name === "session-reminders") {
    const { processSessionReminders } = await import("@/lib/jobs/session-reminders");
    await processSessionReminders();
    return;
  }
  if (name === "zoom-attendance-import" && typeof data.sessionId === "string") {
    const { importSessionAttendance } = await import("@/lib/services/attendance");
    const participants = Array.isArray(data.participants)
      ? (data.participants as Array<{ email: string; durationMinutes: number }>)
      : [];
    await importSessionAttendance(data.sessionId, participants);
    return;
  }

  throw new Error(`Unknown job: ${name}`);
}
