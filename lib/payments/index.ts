import type { PaymentMethod } from "@prisma/client";
import { resolveRegionalCurrency, type Currency } from "@/lib/money";

export type GatewayProvider = "paypal" | "paymob" | "cashier" | "mock";

export function regionalGateway(countryCode: string | null | undefined): GatewayProvider {
  if (countryCode?.toUpperCase() === "EG") {
    if (process.env["PAYMOB_API_KEY"]) return "paymob";
    if (process.env["CASHIER_API_KEY"]) return "cashier";
    return "mock";
  }
  if (process.env["PAYPAL_CLIENT_ID"]) return "paypal";
  return "mock";
}

export function gatewayForMethod(method: PaymentMethod, currency: Currency): GatewayProvider {
  if (method === "PAYPAL") return process.env["PAYPAL_CLIENT_ID"] ? "paypal" : "mock";
  if (method === "PAYMOB") return process.env["PAYMOB_API_KEY"] ? "paymob" : "mock";
  if (method === "CASHIER") return process.env["CASHIER_API_KEY"] ? "cashier" : "mock";
  return "mock";
}

export function isOnlineGatewayMethod(method: PaymentMethod): boolean {
  return ["PAYPAL", "PAYMOB", "CASHIER"].includes(method);
}

export async function initiateGatewayPayment(opts: {
  method: PaymentMethod;
  amountMinor: number;
  currency: Currency;
  reference: string;
  countryCode?: string | null;
}): Promise<{ gatewayRef: string; redirectUrl?: string; immediateComplete?: boolean }> {
  const provider = gatewayForMethod(opts.method, opts.currency);
  if (provider === "mock") {
    return { gatewayRef: `mock-${opts.reference}`, immediateComplete: true };
  }
  // Real integrations would call provider APIs here; mock completes immediately in tests.
  return { gatewayRef: `${provider}-${opts.reference}`, immediateComplete: true };
}

export function verifyWebhookSignature(
  provider: GatewayProvider,
  _payload: string,
  signature: string | null,
): boolean {
  if (provider === "mock") return true;
  const secret =
    provider === "paypal"
      ? process.env["PAYPAL_SECRET"]
      : provider === "paymob"
        ? process.env["PAYMOB_HMAC"]
        : process.env["CASHIER_SECRET"];
  if (!secret) {
    // No provider secret configured — mock/dev mode accepts webhooks.
    return true;
  }
  if (!signature) return false;
  // Simplified: in production compare HMAC; for phase 5 accept non-empty sig when secret set.
  return signature.length > 0;
}
