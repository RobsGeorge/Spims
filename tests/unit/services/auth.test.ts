import { describe, it, expect, vi, beforeEach } from "vitest";

// ── Hoisted mocks ────────────────────────────────────────────────────────────
const mockDb = vi.hoisted(() => ({
  user: {
    findUnique: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    findMany: vi.fn(),
    updateMany: vi.fn(),
  },
  otpToken: {
    findMany: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    updateMany: vi.fn(),
  },
  session: {
    create: vi.fn(),
    findUnique: vi.fn(),
    delete: vi.fn(),
  },
  auditLog: { create: vi.fn() },
  $transaction: vi.fn(),
}));

vi.mock("@/lib/db", () => ({ db: mockDb }));

vi.mock("@/lib/audit", () => ({
  withAudit: vi.fn(async (_ctx: unknown, mutation: (tx: typeof mockDb) => Promise<unknown>) =>
    mutation(mockDb),
  ),
  writeAuditLog: vi.fn(),
}));

vi.mock("argon2", () => ({
  hash: vi.fn(async (str: string) => `hashed:${str}`),
  verify: vi.fn(async (hashed: string, plain: string) => hashed === `hashed:${plain}`),
}));

vi.mock("@/lib/email", () => ({
  sendOtpEmail: vi.fn(),
  sendPasswordResetEmail: vi.fn(),
}));

vi.mock("crypto", async (importOriginal) => {
  const actual = await importOriginal<typeof import("crypto")>();
  return {
    ...actual,
    randomInt: vi.fn(() => 123456),
    randomBytes: vi.fn(() => Buffer.from("aabbccddeeff00112233445566778899aabbccddeeff001122334455", "hex")),
  };
});

// ── Subject ──────────────────────────────────────────────────────────────────
import {
  registerUser,
  verifyOtp,
  setPassword,
  login,
  logout,
  requestPasswordReset,
  confirmPasswordReset,
} from "@/lib/services/auth";
import { sendOtpEmail, sendPasswordResetEmail } from "@/lib/email";

const SA_USER = {
  id: "user-1",
  email: "test@test.com",
  firstName: "Test",
  lastName: "User",
  roles: ["SUPER_ADMIN" as const],
  preferredLocale: "en",
  countryCode: null,
};

beforeEach(() => {
  vi.clearAllMocks();
  mockDb.$transaction.mockImplementation(async (fn: (tx: typeof mockDb) => Promise<unknown>) => fn(mockDb));
  // Default: no email degrades gracefully
  mockDb.otpToken.updateMany.mockResolvedValue({ count: 0 });
  mockDb.otpToken.create.mockResolvedValue({ id: "otp-1" });
});

// ── registerUser ──────────────────────────────────────────────────────────────
describe("registerUser", () => {
  it("creates a PENDING user and sends OTP email", async () => {
    mockDb.user.findUnique.mockResolvedValueOnce(null); // no existing user
    const created = { id: "new-user", email: "a@b.com", firstName: "A", lastName: "B" };
    mockDb.user.create.mockResolvedValue(created);

    const result = await registerUser({ email: "a@b.com", firstName: "A", lastName: "B" });

    expect(result).toEqual({ id: "new-user", email: "a@b.com" });
    expect(mockDb.user.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ email: "a@b.com", status: "PENDING", emailVerified: false }),
      }),
    );
    expect(mockDb.otpToken.create).toHaveBeenCalled();
    expect(sendOtpEmail).toHaveBeenCalledWith("a@b.com", expect.any(String));
  });

  it("does not leave a user without OTP when OTP creation fails", async () => {
    mockDb.user.findUnique.mockResolvedValueOnce(null);
    mockDb.user.create.mockResolvedValue({ id: "new-user", email: "a@b.com" });
    mockDb.otpToken.create.mockRejectedValueOnce(new Error("OTP create failed"));

    await expect(registerUser({ email: "a@b.com", firstName: "A", lastName: "B" })).rejects.toThrow(
      "OTP create failed",
    );
    expect(sendOtpEmail).not.toHaveBeenCalled();
  });

  it("throws CONFLICT when email is already registered", async () => {
    mockDb.user.findUnique.mockResolvedValueOnce({ id: "existing" });
    await expect(registerUser({ email: "a@b.com", firstName: "A", lastName: "B" })).rejects.toMatchObject({
      code: "CONFLICT",
    });
  });
});

// ── verifyOtp ─────────────────────────────────────────────────────────────────
describe("verifyOtp", () => {
  it("marks user email verified when code matches EMAIL_VERIFICATION token", async () => {
    const tokens = [{ id: "tok-1", codeHash: "hashed:123456", createdAt: new Date() }];
    mockDb.otpToken.findMany.mockResolvedValue(tokens);
    mockDb.otpToken.update.mockResolvedValue({});
    mockDb.user.update.mockResolvedValue({});

    await verifyOtp("user-1", "123456", "EMAIL_VERIFICATION");

    expect(mockDb.otpToken.update).toHaveBeenCalledWith(
      expect.objectContaining({ data: { consumedAt: expect.any(Date) } }),
    );
    expect(mockDb.user.update).toHaveBeenCalledWith(
      expect.objectContaining({ data: { emailVerified: true, status: "ACTIVE" } }),
    );
  });

  it("does NOT update user for PASSWORD_RESET purpose", async () => {
    const tokens = [{ id: "tok-1", codeHash: "hashed:123456", createdAt: new Date() }];
    mockDb.otpToken.findMany.mockResolvedValue(tokens);
    mockDb.otpToken.update.mockResolvedValue({});

    await verifyOtp("user-1", "123456", "PASSWORD_RESET");

    expect(mockDb.user.update).not.toHaveBeenCalled();
  });

  it("throws VALIDATION when no matching token found", async () => {
    mockDb.otpToken.findMany.mockResolvedValue([{ id: "tok-1", codeHash: "hashed:999999" }]);
    await expect(verifyOtp("user-1", "000000", "EMAIL_VERIFICATION")).rejects.toMatchObject({
      code: "VALIDATION",
    });
  });

  it("throws VALIDATION when no tokens exist", async () => {
    mockDb.otpToken.findMany.mockResolvedValue([]);
    await expect(verifyOtp("user-1", "123456", "EMAIL_VERIFICATION")).rejects.toMatchObject({
      code: "VALIDATION",
    });
  });
});

// ── setPassword ───────────────────────────────────────────────────────────────
describe("setPassword", () => {
  it("sets password hash and creates session for verified user", async () => {
    mockDb.user.findUnique.mockResolvedValue({ id: "user-1", emailVerified: true });
    mockDb.user.update.mockResolvedValue({});
    const session = { id: "sess-1", token: "tok" };
    mockDb.session.create.mockResolvedValue(session);

    const token = await setPassword("user-1", "password123");

    expect(mockDb.user.update).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ passwordHash: expect.stringContaining("hashed:") }) }),
    );
    expect(typeof token).toBe("string");
    expect(token.length).toBeGreaterThan(0);
  });

  it("throws NOT_FOUND for unknown userId", async () => {
    mockDb.user.findUnique.mockResolvedValue(null);
    await expect(setPassword("bad-id", "password123")).rejects.toMatchObject({ code: "NOT_FOUND" });
  });

  it("throws FORBIDDEN if email not verified", async () => {
    mockDb.user.findUnique.mockResolvedValue({ id: "user-1", emailVerified: false });
    await expect(setPassword("user-1", "password123")).rejects.toMatchObject({ code: "FORBIDDEN" });
  });
});

// ── login ─────────────────────────────────────────────────────────────────────
describe("login", () => {
  const baseUser = {
    id: "user-1",
    email: "a@b.com",
    firstName: "A",
    lastName: "B",
    passwordHash: "hashed:correctPass",
    emailVerified: true,
    status: "ACTIVE",
    preferredLocale: "en",
    countryCode: null,
    roles: [{ role: "STUDENT" }],
  };

  it("returns token and user on valid credentials", async () => {
    mockDb.user.findUnique.mockResolvedValue(baseUser);
    mockDb.session.create.mockResolvedValue({ id: "sess-1" });

    const result = await login("a@b.com", "correctPass", {});
    expect(result.token).toBeDefined();
    expect(result.user.email).toBe("a@b.com");
  });

  it("throws VALIDATION for wrong password", async () => {
    mockDb.user.findUnique.mockResolvedValue(baseUser);
    await expect(login("a@b.com", "wrongPass", {})).rejects.toMatchObject({ code: "VALIDATION" });
  });

  it("throws VALIDATION for unknown email", async () => {
    mockDb.user.findUnique.mockResolvedValue(null);
    await expect(login("x@y.com", "pass", {})).rejects.toMatchObject({ code: "VALIDATION" });
  });

  it("throws FORBIDDEN for suspended account", async () => {
    mockDb.user.findUnique.mockResolvedValue({ ...baseUser, status: "SUSPENDED" });
    await expect(login("a@b.com", "correctPass", {})).rejects.toMatchObject({ code: "FORBIDDEN" });
  });

  it("throws FORBIDDEN for unverified email", async () => {
    mockDb.user.findUnique.mockResolvedValue({ ...baseUser, emailVerified: false });
    await expect(login("a@b.com", "correctPass", {})).rejects.toMatchObject({ code: "FORBIDDEN" });
  });
});

// ── logout ────────────────────────────────────────────────────────────────────
describe("logout", () => {
  it("deletes the session for the given token", async () => {
    mockDb.session.findUnique.mockResolvedValue({ id: "sess-1", token: "abc" });
    mockDb.session.delete.mockResolvedValue({});

    await logout(SA_USER, "abc");

    expect(mockDb.session.delete).toHaveBeenCalledWith({ where: { id: "sess-1" } });
  });

  it("does not throw if session not found", async () => {
    mockDb.session.findUnique.mockResolvedValue(null);
    await expect(logout(SA_USER, "no-token")).resolves.toBeUndefined();
  });
});

// ── requestPasswordReset ──────────────────────────────────────────────────────
describe("requestPasswordReset", () => {
  it("sends a reset email when user exists", async () => {
    mockDb.user.findUnique.mockResolvedValue({ id: "user-1", email: "a@b.com" });

    await requestPasswordReset("a@b.com");

    expect(sendPasswordResetEmail).toHaveBeenCalledWith("a@b.com", expect.any(String));
  });

  it("silently returns when user not found (no error, no email)", async () => {
    mockDb.user.findUnique.mockResolvedValue(null);
    await expect(requestPasswordReset("nobody@x.com")).resolves.toBeUndefined();
    expect(sendPasswordResetEmail).not.toHaveBeenCalled();
  });
});

// ── confirmPasswordReset ──────────────────────────────────────────────────────
describe("confirmPasswordReset", () => {
  it("resets password when code is valid", async () => {
    mockDb.user.findUnique.mockResolvedValue({ id: "user-1", email: "a@b.com" });
    mockDb.otpToken.findMany.mockResolvedValue([{ id: "tok-1", codeHash: "hashed:123456" }]);
    mockDb.otpToken.update.mockResolvedValue({});
    mockDb.user.update.mockResolvedValue({});

    await confirmPasswordReset("a@b.com", "123456", "newPassword1");

    expect(mockDb.otpToken.update).toHaveBeenCalledWith(
      expect.objectContaining({ data: { consumedAt: expect.any(Date) } }),
    );
    expect(mockDb.user.update).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ passwordHash: expect.stringContaining("hashed:") }) }),
    );
  });

  it("consumes OTP and updates password in the same audited transaction", async () => {
    mockDb.user.findUnique.mockResolvedValue({ id: "user-1", email: "a@b.com" });
    mockDb.otpToken.findMany.mockResolvedValue([{ id: "tok-1", codeHash: "hashed:123456" }]);
    const callOrder: string[] = [];
    mockDb.otpToken.update.mockImplementation(async () => {
      callOrder.push("otp");
      return {};
    });
    mockDb.user.update.mockImplementation(async () => {
      callOrder.push("password");
      return {};
    });

    await confirmPasswordReset("a@b.com", "123456", "newPassword1");

    expect(callOrder).toEqual(["otp", "password"]);
  });

  it("throws VALIDATION when email not found", async () => {
    mockDb.user.findUnique.mockResolvedValue(null);
    await expect(confirmPasswordReset("x@y.com", "123456", "newPass")).rejects.toMatchObject({
      code: "VALIDATION",
    });
  });
});
