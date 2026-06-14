import { cookies } from "next/headers";
import { db } from "@/lib/db";
import { RoleType } from "@prisma/client";

const SESSION_COOKIE = "spims_session";
const SESSION_MAX_AGE_SECONDS = 60 * 60 * 24 * 30; // 30 days

export interface SessionUser {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  roles: RoleType[];
  preferredLocale: string;
  countryCode: string | null;
}

/** Read the session from the httpOnly cookie and return the user, or null. */
export async function getSession(): Promise<SessionUser | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE)?.value;
  if (!token) return null;

  const session = await db.session.findUnique({
    where: { token },
    include: {
      user: {
        include: { roles: true },
      },
    },
  });

  if (!session) return null;
  if (session.expiresAt < new Date()) {
    // Expired — clean up lazily
    await db.session.delete({ where: { id: session.id } }).catch(() => null);
    return null;
  }

  const { user } = session;
  return {
    id: user.id,
    email: user.email,
    firstName: user.firstName,
    lastName: user.lastName,
    roles: user.roles.map((r) => r.role),
    preferredLocale: user.preferredLocale,
    countryCode: user.countryCode,
  };
}

/** Require a session or throw 401. */
export async function requireSession(): Promise<SessionUser> {
  const user = await getSession();
  if (!user) {
    const { AppError } = await import("@/lib/errors");
    throw AppError.unauthorized();
  }
  return user;
}

/** Set the session cookie after successful login. */
export async function setSessionCookie(token: string): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.set(SESSION_COOKIE, token, {
    httpOnly: true,
    secure: process.env["NODE_ENV"] === "production",
    sameSite: "lax",
    path: "/",
    maxAge: SESSION_MAX_AGE_SECONDS,
  });
}

/** Clear the session cookie on logout. */
export async function clearSessionCookie(): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.delete(SESSION_COOKIE);
}
