import { RoleType } from "@prisma/client";
import { db } from "@/lib/db";

export async function isOfferingStaff(
  userId: string,
  offeringId: string,
): Promise<boolean> {
  const row = await db.offeringStaff.findFirst({
    where: { offeringId, userId },
  });
  return Boolean(row);
}

export async function assertOfferingContentAccess(
  userId: string,
  offeringId: string,
  roles: RoleType[],
): Promise<void> {
  if (roles.includes(RoleType.SUPER_ADMIN) || roles.includes(RoleType.ACADEMIC_ADMIN)) {
    return;
  }
  const ok = await isOfferingStaff(userId, offeringId);
  if (!ok) {
    const { AppError } = await import("@/lib/errors");
    throw AppError.forbidden("Not assigned to this offering");
  }
}

export async function getStaffOfferingIds(userId: string): Promise<string[]> {
  const rows = await db.offeringStaff.findMany({
    where: { userId },
    select: { offeringId: true },
  });
  return rows.map((r) => r.offeringId);
}
