import { NextRequest } from "next/server";

export function requestContext(req: NextRequest) {
  return {
    ip: req.headers.get("x-forwarded-for") ?? undefined,
    userAgent: req.headers.get("user-agent") ?? undefined,
    requestId: req.headers.get("x-request-id") ?? undefined,
  };
}

export async function assertEnrolledStudent(userId: string, offeringId: string) {
  const { assertStudentEnrolled } = await import("@/lib/services/assessment");
  return assertStudentEnrolled(userId, offeringId);
}
