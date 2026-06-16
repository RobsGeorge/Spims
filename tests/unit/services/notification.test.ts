import { describe, it, expect, vi, beforeEach } from "vitest";

const mockDb = vi.hoisted(() => ({
  notification: { create: vi.fn(), findMany: vi.fn(), findFirst: vi.fn(), update: vi.fn(), count: vi.fn() },
}));

vi.mock("@/lib/db", () => ({ db: mockDb }));
vi.mock("@/lib/jobs/queue", () => ({ enqueueJob: vi.fn().mockResolvedValue(undefined) }));

import { notifyUser, markNotificationRead } from "@/lib/services/notification";
import { enqueueJob } from "@/lib/jobs/queue";

beforeEach(() => vi.clearAllMocks());

describe("notification service", () => {
  it("creates in-app notification and enqueues email", async () => {
    mockDb.notification.create.mockResolvedValue({ id: "n1", userId: "u1" });
    await notifyUser("u1", { type: "TEST", title: "Hi", body: "Body" });
    expect(mockDb.notification.create).toHaveBeenCalled();
    expect(enqueueJob).toHaveBeenCalledWith("notification-dispatch", { notificationId: "n1" });
  });

  it("marks notification read for owner", async () => {
    mockDb.notification.findFirst.mockResolvedValue({ id: "n1", userId: "u1" });
    mockDb.notification.update.mockResolvedValue({ id: "n1", readAt: new Date() });
    const result = await markNotificationRead("u1", "n1");
    expect(result).toBeTruthy();
  });
});
