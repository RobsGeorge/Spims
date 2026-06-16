import { describe, it, expect, vi, beforeEach } from "vitest";

const mockDb = vi.hoisted(() => ({
  setting: { findUnique: vi.fn(), upsert: vi.fn() },
  auditLog: { create: vi.fn() },
  $transaction: vi.fn(),
}));

vi.mock("@/lib/db", () => ({ db: mockDb }));
vi.mock("@/lib/audit", () => ({
  withAudit: vi.fn(async (_ctx: unknown, fn: (tx: typeof mockDb) => Promise<unknown>) => fn(mockDb)),
}));

import { getSettingValue, putSetting } from "@/lib/services/settings";

const ADM = {
  id: "adm-1",
  email: "adm@test.com",
  firstName: "Admin",
  lastName: "User",
  roles: ["ADMINISTRATIVE_ADMIN" as const],
  preferredLocale: "en",
  countryCode: null,
};

beforeEach(() => vi.clearAllMocks());

describe("settings service", () => {
  it("returns default concurrent hosts", async () => {
    mockDb.setting.findUnique.mockResolvedValue(null);
    expect(await getSettingValue("zoom.concurrent_hosts")).toBe(1);
  });

  it("persists setting value", async () => {
    mockDb.setting.upsert.mockResolvedValue({ key: "zoom.concurrent_hosts", value: 2 });
    const row = await putSetting(ADM, "zoom.concurrent_hosts", 2);
    expect(row.key).toBe("zoom.concurrent_hosts");
  });
});
