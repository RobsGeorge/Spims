import { NextRequest } from "next/server";
import { handlePaymentWebhook } from "@/lib/api/webhook-handler";

export async function POST(req: NextRequest) {
  return handlePaymentWebhook(req, "cashier");
}
