import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/lib/db", () => ({ db: {} }));

import { regionalGateway, gatewayForMethod, verifyWebhookSignature } from "@/lib/payments";
import { PaymentMethod } from "@prisma/client";

describe("payment routing", () => {
  const orig = { ...process.env };

  beforeEach(() => {
    process.env = { ...orig };
    delete process.env["PAYPAL_CLIENT_ID"];
    delete process.env["PAYMOB_API_KEY"];
    delete process.env["CASHIER_API_KEY"];
  });

  it("regionalGateway returns mock without keys", () => {
    expect(regionalGateway("EG")).toBe("mock");
    expect(regionalGateway("US")).toBe("mock");
  });

  it("gatewayForMethod returns mock when keys missing", () => {
    expect(gatewayForMethod(PaymentMethod.PAYPAL, "USD")).toBe("mock");
  });

  it("verifyWebhookSignature accepts when no secret configured", () => {
    expect(verifyWebhookSignature("paypal", "{}", null)).toBe(true);
  });

  it("verifyWebhookSignature rejects empty signature when secret configured", () => {
    process.env["PAYPAL_SECRET"] = "secret";
    expect(verifyWebhookSignature("paypal", "{}", null)).toBe(false);
    expect(verifyWebhookSignature("paypal", "{}", "sig")).toBe(true);
  });
});
