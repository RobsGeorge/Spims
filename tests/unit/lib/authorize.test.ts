import { describe, it, expect } from "vitest";
import { RoleType } from "@prisma/client";
import { authorize, can, requireRole } from "@/lib/auth/authorize";
import { AppError } from "@/lib/errors";
import type { SessionUser } from "@/lib/auth/session";

function makeUser(roles: RoleType[]): SessionUser {
  return {
    id: "usr_test",
    email: "test@example.com",
    firstName: "Test",
    lastName: "User",
    roles,
    preferredLocale: "en",
    countryCode: null,
  };
}

const SA = makeUser([RoleType.SUPER_ADMIN]);
const STUDENT = makeUser([RoleType.STUDENT]);
const ACA = makeUser([RoleType.ACADEMIC_ADMIN]);
const MULTI = makeUser([RoleType.STUDENT, RoleType.INSTRUCTOR]);

describe("authorize()", () => {
  it("allows Super Admin on any action", () => {
    expect(() => authorize(SA, "audit.readAll")).not.toThrow();
    expect(() => authorize(SA, "grade.lock")).not.toThrow();
    expect(() => authorize(SA, "branding.manage")).not.toThrow();
  });

  it("throws UNAUTHORIZED when user is null", () => {
    expect(() => authorize(null, "profile.viewOwn")).toThrow(AppError);
    try {
      authorize(null, "profile.viewOwn");
    } catch (e) {
      expect(e instanceof AppError && e.code).toBe("UNAUTHORIZED");
    }
  });

  it("throws FORBIDDEN when role is not in the permission map", () => {
    expect(() => authorize(STUDENT, "audit.readAll")).toThrow(AppError);
    try {
      authorize(STUDENT, "audit.readAll");
    } catch (e) {
      expect(e instanceof AppError && e.code).toBe("FORBIDDEN");
    }
  });

  it("allows action permitted to a specific role", () => {
    expect(() => authorize(ACA, "program.manage")).not.toThrow();
    expect(() => authorize(STUDENT, "enrollment.self")).not.toThrow();
  });

  it("denies action not permitted to the role", () => {
    expect(() => authorize(STUDENT, "program.manage")).toThrow(AppError);
    expect(() => authorize(ACA, "enrollment.self")).toThrow(AppError);
  });

  it("allows any-authenticated action for any role", () => {
    expect(() => authorize(STUDENT, "profile.viewOwn")).not.toThrow();
    expect(() => authorize(ACA, "profile.editOwn")).not.toThrow();
    expect(() => authorize(MULTI, "credential.verify")).not.toThrow();
  });

  it("uses union of roles for multi-role user", () => {
    // MULTI has STUDENT + INSTRUCTOR
    // INSTRUCTOR can lock grades
    expect(() => authorize(MULTI, "grade.lock")).not.toThrow();
    // STUDENT can take assessments
    expect(() => authorize(MULTI, "assessment.take")).not.toThrow();
  });

  it("scope check — denies when scopeCheck returns false", () => {
    expect(() =>
      authorize(ACA, "offering.editContent", { scopeCheck: () => false }),
    ).toThrow(AppError);
  });

  it("scope check — allows when scopeCheck returns true", () => {
    expect(() =>
      authorize(ACA, "offering.editContent", { scopeCheck: () => true }),
    ).not.toThrow();
  });

  it("async scope check — denies when resolves false", async () => {
    await expect(
      authorize(ACA, "offering.editContent", {
        scopeCheck: () => Promise.resolve(false),
      }),
    ).rejects.toBeInstanceOf(AppError);
  });

  it("async scope check — allows when resolves true", async () => {
    await expect(
      authorize(ACA, "offering.editContent", {
        scopeCheck: () => Promise.resolve(true),
      }),
    ).resolves.toBeUndefined();
  });
});

describe("can()", () => {
  it("returns false for null user", () => {
    expect(can(null, "profile.viewOwn")).toBe(false);
  });

  it("returns true for SA on anything", () => {
    expect(can(SA, "audit.readAll")).toBe(true);
  });

  it("returns true/false based on role", () => {
    expect(can(STUDENT, "enrollment.self")).toBe(true);
    expect(can(STUDENT, "semester.manage")).toBe(false);
  });
});

describe("requireRole()", () => {
  it("passes when user holds the role", () => {
    expect(() => requireRole(ACA, RoleType.ACADEMIC_ADMIN)).not.toThrow();
  });

  it("throws FORBIDDEN when user lacks the role", () => {
    expect(() => requireRole(STUDENT, RoleType.ACADEMIC_ADMIN)).toThrow(AppError);
  });

  it("SA bypasses requireRole", () => {
    expect(() => requireRole(SA, RoleType.FINANCIAL_ADMIN)).not.toThrow();
  });
});
