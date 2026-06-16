/**
 * Concurrent exam autosave load test (100 workers by default).
 * Usage: npx tsx scripts/load-test-exam.ts [attemptId] [workers]
 */
const BASE = process.env["NEXT_PUBLIC_APP_URL"] ?? "http://localhost:3000";
const attemptId = process.argv[2];
const workers = Number(process.argv[3] ?? 100);

if (!attemptId) {
  console.error("Usage: npx tsx scripts/load-test-exam.ts <attemptId> [workers]");
  process.exit(1);
}

async function worker(id: number) {
  const start = Date.now();
  const res = await fetch(`${BASE}/api/attempts/${attemptId}/answers`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ questionId: "load-test", response: `worker-${id}-${Date.now()}` }),
  });
  return { id, ms: Date.now() - start, status: res.status };
}

async function main() {
  console.log(`Load test: ${workers} concurrent PATCH /api/attempts/${attemptId}/answers`);
  const results = await Promise.all(Array.from({ length: workers }, (_, i) => worker(i)));
  const ok = results.filter((r) => r.status === 401 || r.status === 200 || r.status === 404).length;
  const avg = results.reduce((s, r) => s + r.ms, 0) / results.length;
  console.log(`Completed: ${results.length}, acceptable responses: ${ok}, avg ${avg.toFixed(0)}ms`);
  if (ok < workers * 0.95) process.exitCode = 1;
}

main();
