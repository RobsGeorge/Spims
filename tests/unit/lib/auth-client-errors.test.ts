import { describe, expect, it } from "vitest";
import { getAuthErrorMessage } from "@/lib/auth/client-errors";

describe("getAuthErrorMessage", () => {
  const t = (key: string) => key;

  it("maps known server messages to translation keys", () => {
    expect(getAuthErrorMessage(t, { message: "Invalid email or password" })).toBe(
      "auth.invalidCredentials",
    );
    expect(getAuthErrorMessage(t, { message: "Email already registered" })).toBe(
      "auth.emailAlreadyRegistered",
    );
  });

  it("uses alert keys when mode is alert", () => {
    expect(getAuthErrorMessage(t, { message: "Invalid email or password" }, "alert")).toBe(
      "auth.invalidCredentialsAlert",
    );
  });

  it("falls back to common.error for unknown messages", () => {
    expect(getAuthErrorMessage(t, { message: "Something else" })).toBe("common.error");
  });
});
