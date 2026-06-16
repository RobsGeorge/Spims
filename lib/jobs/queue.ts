import { db } from "@/lib/db";

export function isQueueAvailable(): boolean {
  return Boolean(process.env["REDIS_URL"]);
}

async function runInline(name: string, data: Record<string, unknown>) {
  if (name === "receipt-pdf" && typeof data.paymentId === "string") {
    const { finalizePaymentReceipt } = await import("@/lib/services/receipt");
    await finalizePaymentReceipt(data.paymentId);
  }
  if (name === "attempt-auto-submit" && typeof data.attemptId === "string") {
    const { autoSubmitDueAttempt, processDueAttempts } = await import("@/lib/services/attempt");
    await autoSubmitDueAttempt(data.attemptId);
    await processDueAttempts();
  }
  if (name === "ai-essay-grade" && typeof data.attemptId === "string") {
    const { runAiEssayGrading } = await import("@/lib/services/attempt");
    await runAiEssayGrading(data.attemptId);
  }
}

export async function enqueueJob(name: string, data: Record<string, unknown>) {
  if (!isQueueAvailable()) {
    await runInline(name, data);
    return;
  }

  try {
    const { Queue } = await import("bullmq");
    const queue = new Queue("spims-jobs", {
      connection: {
        url: process.env["REDIS_URL"]!,
        connectTimeout: 2_000,
        maxRetriesPerRequest: 1,
      },
    });
    await Promise.race([
      queue.add(name, data).then(() => queue.close()),
      new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error("Redis queue timeout")), 3_000),
      ),
    ]);
  } catch {
    await runInline(name, data);
  }
}
