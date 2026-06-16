import { processJob } from "@/lib/jobs/process-job";

export function isQueueAvailable(): boolean {
  return Boolean(process.env["REDIS_URL"]);
}

export async function enqueueJob(name: string, data: Record<string, unknown>) {
  if (!isQueueAvailable()) {
    await processJob(name, data);
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
    await processJob(name, data);
  }
}
