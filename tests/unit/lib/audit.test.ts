import { describe, it, expect, vi, beforeEach } from "vitest";
import { RoleType } from "@prisma/client";
import type { SessionUser } from "@/lib/auth/session";

// Minimal Prisma transaction client shape needed by withAudit
type MinimalTx = {
  auditLog: {
    create: (args: { data: Record<string, unknown> }) => Promise<Record<string, unknown>>;
  };
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyFn = (...args: any[]) => any;

// Captured logs array shared by all mock calls
const capturedLogs: Record<string, unknown>[] = [];

vi.mock("@/lib/db", () => {
  const makeTx = (): MinimalTx => ({
    auditLog: {
      create: vi.fn(async ({ data }: { data: Record<string, unknown> }) => {
        capturedLogs.push(data);
        return data;
      }),
    },
  });

  return {
    db: {
      $transaction: vi.fn(async (fn: AnyFn) => fn(makeTx())),
      auditLog: {
        create: vi.fn(async ({ data }: { data: Record<string, unknown> }) => {
          capturedLogs.push(data);
          return data;
        }),
      },
    },
  };
});

import { withAudit, writeAuditLog } from "@/lib/audit";
import { db } from "@/lib/db";

function makeUser(roles: RoleType[] = [RoleType.SUPER_ADMIN]): SessionUser {
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

beforeEach(() => {
  vi.clearAllMocks();
  capturedLogs.length = 0;
});

describe("withAudit()", () => {
  it("calls the mutation and writes an AuditLog row in the same transaction", async () => {
    const user = makeUser();
    let mutationCalled = false;

    const result = await withAudit(
      {
        actor: user,
        action: "test.create",
        entityType: "Widget",
        entityId: "wid_1",
        after: { foo: "bar" },
        requestId: "req_abc",
      },
      async (_tx) => {
        mutationCalled = true;
        return { id: "wid_1", name: "test" };
      },
    );

    expect(mutationCalled).toBe(true);
    expect(result).toEqual({ id: "wid_1", name: "test" });
    expect(db.$transaction).toHaveBeenCalledOnce();
  });

  it("auto-captures entityId from result.id when not pre-set", async () => {
    const user = makeUser();

    await withAudit(
      { actor: user, action: "test.auto-id", entityType: "Widget" },
      async () => ({ id: "auto_123" }),
    );

    expect(capturedLogs).toHaveLength(1);
    expect(capturedLogs[0]).toMatchObject({ entityId: "auto_123" });
  });

  it("records actorId and actorRole", async () => {
    const user = makeUser([RoleType.ACADEMIC_ADMIN]);

    await withAudit(
      { actor: user, action: "grade.lock", entityType: "Enrollment", entityId: "enr_1" },
      async () => ({ id: "enr_1" }),
    );

    expect(capturedLogs[0]).toMatchObject({
      actorId: "usr_test",
      actorRole: RoleType.ACADEMIC_ADMIN,
      action: "grade.lock",
    });
  });

  it("records null actorId for system actions", async () => {
    await withAudit(
      { actor: null, action: "system.auto-submit", entityType: "AttemptAnswer" },
      async () => ({ id: "ans_1" }),
    );

    expect(capturedLogs[0]).toMatchObject({ actorId: null });
  });
});

describe("writeAuditLog()", () => {
  it("writes directly to db.auditLog when no tx provided", async () => {
    const user = makeUser();
    await writeAuditLog({
      actor: user,
      action: "standalone.write",
      entityType: "Setting",
      entityId: "key_1",
    });
    expect(db.auditLog.create).toHaveBeenCalledOnce();
  });
});
