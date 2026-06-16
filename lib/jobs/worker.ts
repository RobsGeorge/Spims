import { processJob } from "@/lib/jobs/process-job";
import { isQueueAvailable } from "@/lib/jobs/queue";

const QUEUE_NAME = "spims-jobs";

async function main() {
  if (!isQueueAvailable()) {
    console.error("REDIS_URL is not set — worker cannot start.");
    process.exit(1);
  }

  const { Worker } = await import("bullmq");

  const worker = new Worker(
    QUEUE_NAME,
    async (job) => {
      await processJob(job.name, job.data as Record<string, unknown>);
    },
    {
      connection: {
        url: process.env["REDIS_URL"]!,
        maxRetriesPerRequest: null,
      },
    },
  );

  worker.on("completed", (job) => {
    console.log(`[worker] completed ${job.name} (${job.id})`);
  });

  worker.on("failed", (job, err) => {
    console.error(`[worker] failed ${job?.name} (${job?.id}):`, err.message);
  });

  console.log(`[worker] listening on queue "${QUEUE_NAME}"`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
