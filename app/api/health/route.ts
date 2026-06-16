import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { isQueueAvailable } from "@/lib/jobs/queue";
import packageJson from "@/package.json";

export const dynamic = "force-dynamic";

async function checkDatabase(): Promise<boolean> {
  try {
    await db.$queryRaw`SELECT 1`;
    return true;
  } catch {
    return false;
  }
}

async function checkRedis(): Promise<boolean> {
  if (!isQueueAvailable()) return false;
  try {
    const { default: Redis } = await import("ioredis");
    const redis = new Redis(process.env["REDIS_URL"]!, {
      connectTimeout: 2_000,
      maxRetriesPerRequest: 1,
      lazyConnect: true,
    });
    await redis.connect();
    const pong = await redis.ping();
    await redis.quit();
    return pong === "PONG";
  } catch {
    return false;
  }
}

export async function GET() {
  const [database, redis] = await Promise.all([checkDatabase(), checkRedis()]);
  const ok = database;
  const status = ok ? (redis ? "ok" : "degraded") : "error";

  return NextResponse.json(
    {
      status,
      version: packageJson.version,
      checks: { database, redis },
      timestamp: new Date().toISOString(),
    },
    { status: ok ? 200 : 503 },
  );
}
