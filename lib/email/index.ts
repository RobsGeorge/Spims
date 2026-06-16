import nodemailer from "nodemailer";

function getTransporter() {
  const host = process.env["EMAIL_HOST"];
  if (!host) return null;

  return nodemailer.createTransport({
    host,
    port: parseInt(process.env["EMAIL_PORT"] ?? "587", 10),
    auth: process.env["EMAIL_USER"]
      ? { user: process.env["EMAIL_USER"], pass: process.env["EMAIL_PASS"] }
      : undefined,
  });
}

const FROM = () => process.env["EMAIL_FROM"] ?? "noreply@spims.local";

export async function sendOtpEmail(to: string, code: string): Promise<void> {
  const t = getTransporter();
  if (!t) {
    // Graceful degradation — log to console in dev so devs can test flows
    console.warn(`[email] No EMAIL_HOST — OTP for ${to}: ${code}`);
    return;
  }
  await t.sendMail({
    from: FROM(),
    to,
    subject: "Your Spims verification code",
    text: `Your verification code is: ${code}\n\nThis code expires in 10 minutes.`,
    html: `<p>Your verification code is: <strong>${code}</strong></p><p>Expires in 10 minutes.</p>`,
  });
}

export async function sendPasswordResetEmail(to: string, code: string): Promise<void> {
  const t = getTransporter();
  if (!t) {
    console.warn(`[email] No EMAIL_HOST — reset code for ${to}: ${code}`);
    return;
  }
  await t.sendMail({
    from: FROM(),
    to,
    subject: "Your Spims password reset code",
    text: `Your password reset code is: ${code}\n\nThis code expires in 10 minutes.`,
    html: `<p>Your password reset code is: <strong>${code}</strong></p><p>Expires in 10 minutes.</p>`,
  });
}

export async function sendApplicationDecisionEmail(
  to: string,
  programName: string,
  decision: string,
  note?: string,
): Promise<void> {
  const t = getTransporter();
  const subject = `Application decision: ${decision}`;
  const body = `Your application to ${programName} was ${decision}.${note ? `\n\nNote: ${note}` : ""}`;
  if (!t) {
    console.warn(`[email] No EMAIL_HOST — decision for ${to}: ${decision}`);
    return;
  }
  await t.sendMail({
    from: FROM(),
    to,
    subject,
    text: body,
    html: `<p>${body.replace(/\n/g, "<br>")}</p>`,
  });
}

export async function sendNotificationEmail(to: string, subject: string, body: string): Promise<void> {
  const t = getTransporter();
  if (!t) {
    console.warn(`[email] No EMAIL_HOST — notification for ${to}: ${subject}`);
    return;
  }
  await t.sendMail({
    from: FROM(),
    to,
    subject,
    text: body,
    html: `<p>${body.replace(/\n/g, "<br>")}</p>`,
  });
}

export async function sendSessionReminderEmail(
  to: string,
  sessionTitle: string,
  whenLabel: string,
): Promise<void> {
  const subject = `Reminder: ${sessionTitle}`;
  const body = `Your live session "${sessionTitle}" starts in ${whenLabel}.`;
  await sendNotificationEmail(to, subject, body);
}
