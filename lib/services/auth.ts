import { db } from "@/lib/db";
import { hash, verify } from "argon2";
import { randomInt, randomBytes } from "crypto";
import type { SessionUser } from "@/lib/auth/session";
import { withAudit } from "@/lib/audit";
import { AppError } from "@/lib/errors";
import { sendOtpEmail, sendPasswordResetEmail } from "@/lib/email";
import type { OtpPurpose } from "@prisma/client";

const OTP_EXPIRY_MS = 10 * 60 * 1000;
const SESSION_EXPIRY_MS = 30 * 24 * 60 * 60 * 1000;

export async function issueOtp(userId: string, purpose: OtpPurpose): Promise<string> {
  // Invalidate any previous active tokens for this purpose
  await db.otpToken.updateMany({
    where: { userId, purpose, consumedAt: null },
    data: { consumedAt: new Date() },
  });

  const code = String(randomInt(100000, 1000000)).padStart(6, "0");
  const codeHash = await hash(code);
  const expiresAt = new Date(Date.now() + OTP_EXPIRY_MS);

  await db.otpToken.create({ data: { userId, purpose, codeHash, expiresAt } });
  return code;
}

export async function verifyOtp(
  userId: string,
  code: string,
  purpose: OtpPurpose,
): Promise<void> {
  const tokens = await db.otpToken.findMany({
    where: { userId, purpose, consumedAt: null, expiresAt: { gt: new Date() } },
    orderBy: { createdAt: "desc" },
    take: 5,
  });

  for (const token of tokens) {
    if (await verify(token.codeHash, code)) {
      await db.otpToken.update({ where: { id: token.id }, data: { consumedAt: new Date() } });

      if (purpose === "EMAIL_VERIFICATION") {
        await db.user.update({
          where: { id: userId },
          data: { emailVerified: true, status: "ACTIVE" },
        });
      }
      return;
    }
  }

  throw AppError.validation("Invalid or expired verification code");
}

export async function registerUser(data: {
  email: string;
  firstName: string;
  lastName: string;
  phone?: string;
}): Promise<{ id: string; email: string }> {
  const existing = await db.user.findUnique({ where: { email: data.email } });
  if (existing) throw AppError.conflict("Email already registered");

  const user = await withAudit(
    { actor: null, action: "user.register", entityType: "User" },
    async (tx) =>
      tx.user.create({
        data: {
          email: data.email,
          firstName: data.firstName,
          lastName: data.lastName,
          phone: data.phone,
          status: "PENDING",
          emailVerified: false,
        },
      }),
  );

  const code = await issueOtp(user.id, "EMAIL_VERIFICATION");
  await sendOtpEmail(data.email, code);

  return { id: user.id, email: user.email };
}

export async function setPassword(
  userId: string,
  password: string,
  ctx?: { ip?: string; userAgent?: string; requestId?: string },
): Promise<string> {
  const user = await db.user.findUnique({ where: { id: userId } });
  if (!user) throw AppError.notFound("User");
  if (!user.emailVerified) throw AppError.forbidden("Email must be verified before setting a password");

  const passwordHash = await hash(password);
  const token = randomBytes(32).toString("hex");
  const expiresAt = new Date(Date.now() + SESSION_EXPIRY_MS);

  await withAudit(
    { actor: null, action: "user.setPassword", entityType: "User", entityId: userId, ...ctx },
    async (tx) => {
      await tx.user.update({ where: { id: userId }, data: { passwordHash } });
      return tx.session.create({ data: { userId, token, expiresAt, ip: ctx?.ip, userAgent: ctx?.userAgent } });
    },
  );

  return token;
}

export async function login(
  email: string,
  password: string,
  ctx: { ip?: string; userAgent?: string; requestId?: string },
): Promise<{ token: string; user: { id: string; email: string; firstName: string; lastName: string } }> {
  const user = await db.user.findUnique({
    where: { email },
    include: { roles: true },
  });

  // Same error for missing user and wrong password — don't reveal which
  if (!user || !user.passwordHash) throw AppError.validation("Invalid email or password");
  if (user.status === "SUSPENDED") throw AppError.forbidden("Account suspended");
  if (!user.emailVerified) throw AppError.forbidden("Email not verified");

  const valid = await verify(user.passwordHash, password);
  if (!valid) throw AppError.validation("Invalid email or password");

  const sessionActor: SessionUser = {
    id: user.id,
    email: user.email,
    firstName: user.firstName,
    lastName: user.lastName,
    roles: user.roles.map((r) => r.role),
    preferredLocale: user.preferredLocale,
    countryCode: user.countryCode,
  };

  const token = randomBytes(32).toString("hex");
  const expiresAt = new Date(Date.now() + SESSION_EXPIRY_MS);

  await withAudit(
    { actor: sessionActor, action: "user.login", entityType: "Session", ...ctx },
    async (tx) =>
      tx.session.create({ data: { userId: user.id, token, expiresAt, ip: ctx.ip, userAgent: ctx.userAgent } }),
  );

  return { token, user: { id: user.id, email: user.email, firstName: user.firstName, lastName: user.lastName } };
}

export async function logout(
  actor: SessionUser,
  token: string,
  ctx?: { ip?: string; userAgent?: string; requestId?: string },
): Promise<void> {
  await withAudit(
    { actor, action: "user.logout", entityType: "Session", ...ctx },
    async (tx) => {
      const session = await tx.session.findUnique({ where: { token } });
      if (session) await tx.session.delete({ where: { id: session.id } });
      return session ?? { id: "none" };
    },
  );
}

export async function requestPasswordReset(email: string): Promise<void> {
  const user = await db.user.findUnique({ where: { email } });
  if (!user) return; // Silent — don't reveal whether email exists

  const code = await issueOtp(user.id, "PASSWORD_RESET");
  await sendPasswordResetEmail(email, code);
}

export async function confirmPasswordReset(
  email: string,
  code: string,
  newPassword: string,
  ctx?: { ip?: string; userAgent?: string; requestId?: string },
): Promise<void> {
  const user = await db.user.findUnique({ where: { email } });
  if (!user) throw AppError.validation("Invalid or expired code");

  await verifyOtp(user.id, code, "PASSWORD_RESET");

  const passwordHash = await hash(newPassword);
  await withAudit(
    { actor: null, action: "user.passwordReset", entityType: "User", entityId: user.id, ...ctx },
    async (tx) => {
      await tx.user.update({ where: { id: user.id }, data: { passwordHash } });
      return { id: user.id };
    },
  );
}
