import { performance } from "node:perf_hooks";
import { sql } from "drizzle-orm";
import { db, dbReady, describeDbTarget } from "../src/server/db/connection";
import { getDashboard } from "../src/server/services/report.service";
import { listJobs } from "../src/server/services/job.service";
import { listCustomers } from "../src/server/services/customer.service";
import { listInvoices } from "../src/server/services/invoice.service";
import { getPartsUsage } from "../src/server/services/report.service";
import { resolvePreset } from "../src/lib/date-range";
import { jwtVerify, SignJWT } from "jose";

function percentile(arr: number[], p: number): number {
  if (arr.length === 0) return 0;
  const sorted = [...arr].sort((a, b) => a - b);
  const index = Math.ceil((p / 100) * sorted.length) - 1;
  return Number(sorted[Math.max(0, index)].toFixed(2));
}

async function runBenchmark(name: string, fn: () => Promise<unknown>, concurrency: number, total: number) {
  const latencies: number[] = [];
  const start = performance.now();
  let completed = 0;

  async function worker() {
    while (completed < total) {
      completed++;
      const t0 = performance.now();
      await fn();
      latencies.push(performance.now() - t0);
    }
  }

  const workers = Array.from({ length: concurrency }, () => worker());
  await Promise.all(workers);
  const duration = performance.now() - start;
  const rps = Number(((total / duration) * 1000).toFixed(1));

  return {
    name,
    total,
    concurrency,
    durationMs: Number(duration.toFixed(1)),
    rps,
    min: Number(Math.min(...latencies).toFixed(2)),
    p50: percentile(latencies, 50),
    p90: percentile(latencies, 90),
    p95: percentile(latencies, 95),
    p99: percentile(latencies, 99),
    max: Number(Math.max(...latencies).toFixed(2)),
  };
}

async function main() {
  await dbReady();
  console.log(`\n======================================================`);
  console.log(`  GMS API & DATABASE LOAD TEST & BENCHMARK SUITE`);
  console.log(`  Target: ${describeDbTarget()}`);
  console.log(`======================================================\n`);

  // 1. Auth Simulation: Zero-DB JWT verification vs Full DB lookup
  console.log(`[1/4] Benchmarking Auth Overhead (1,000 requests, concurrency 20)...`);
  const secret = new TextEncoder().encode("garage-manager-dev-secret-change-me");
  const token = await new SignJWT({ userId: "admin-id", email: "admin@garage.com", role: "ADMIN" })
    .setProtectedHeader({ alg: "HS256" })
    .sign(secret);

  const authJwtBench = await runBenchmark(
    "Auth (Signed JWT - Zero DB hit)",
    async () => {
      await jwtVerify(token, secret);
    },
    20,
    1000,
  );

  const authDbBench = await runBenchmark(
    "Auth (Legacy - DB SELECT users WHERE id)",
    async () => {
      await jwtVerify(token, secret);
      await db.execute(sql`select email, role from users limit 1`);
    },
    20,
    1000,
  );

  console.table([
    {
      Strategy: authJwtBench.name,
      RPS: authJwtBench.rps,
      "p50 (ms)": authJwtBench.p50,
      "p95 (ms)": authJwtBench.p95,
      "p99 (ms)": authJwtBench.p99,
    },
    {
      Strategy: authDbBench.name,
      RPS: authDbBench.rps,
      "p50 (ms)": authDbBench.p50,
      "p95 (ms)": authDbBench.p95,
      "p99 (ms)": authDbBench.p99,
    },
  ]);

  // 2. Dashboard Load Test (Aggregated endpoint vs fan-out)
  console.log(`\n[2/4] Benchmarking Consolidated Dashboard (100 concurrent requests)...`);
  const dashboardBench = await runBenchmark(
    "GET /api/dashboard (Consolidated: summary + activeJobs + invoices + lowStock + partsUsage + outstanding)",
    async () => {
      await getDashboard();
    },
    20,
    100,
  );

  console.table([
    {
      Endpoint: "Dashboard Consolidated",
      Requests: dashboardBench.total,
      Concurrency: dashboardBench.concurrency,
      RPS: dashboardBench.rps,
      "p50 (ms)": dashboardBench.p50,
      "p90 (ms)": dashboardBench.p90,
      "p95 (ms)": dashboardBench.p95,
      "Max (ms)": dashboardBench.max,
    },
  ]);

  // 3. Hot Paths Under Concurrency (Jobs, Customers, Invoices, Parts Usage)
  console.log(`\n[3/4] Benchmarking Hot API Operations Under Concurrency (100 requests each, concurrency 10)...`);

  const jobsBench = await runBenchmark(
    "listJobs (Pre-aggregated Joins, limit 100)",
    async () => {
      await listJobs({ limit: 100 });
    },
    10,
    100,
  );

  const jobsSearchBench = await runBenchmark(
    "listJobs (Filter q='vibration')",
    async () => {
      await listJobs({ q: "vibration", limit: 20 });
    },
    10,
    100,
  );

  const customersBench = await runBenchmark(
    "listCustomers (Pre-aggregated Joins, limit 50)",
    async () => {
      await listCustomers({ limit: 50 });
    },
    10,
    100,
  );

  const partsUsageBench = await runBenchmark(
    "partsUsage (Today window, limit 4)",
    async () => {
      await getPartsUsage(resolvePreset("today"), { limit: 4 });
    },
    10,
    100,
  );

  const invoicesBench = await runBenchmark(
    "listInvoices (Recent invoices)",
    async () => {
      await listInvoices({});
    },
    10,
    100,
  );

  console.table([
    { Operation: jobsBench.name, RPS: jobsBench.rps, "p50 (ms)": jobsBench.p50, "p95 (ms)": jobsBench.p95 },
    { Operation: jobsSearchBench.name, RPS: jobsSearchBench.rps, "p50 (ms)": jobsSearchBench.p50, "p95 (ms)": jobsSearchBench.p95 },
    { Operation: customersBench.name, RPS: customersBench.rps, "p50 (ms)": customersBench.p50, "p95 (ms)": customersBench.p95 },
    { Operation: partsUsageBench.name, RPS: partsUsageBench.rps, "p50 (ms)": partsUsageBench.p50, "p95 (ms)": partsUsageBench.p95 },
    { Operation: invoicesBench.name, RPS: invoicesBench.rps, "p50 (ms)": invoicesBench.p50, "p95 (ms)": invoicesBench.p95 },
  ]);

  // 4. EXPLAIN (ANALYZE, BUFFERS) Query Plans
  console.log(`\n[4/4] Running EXPLAIN (ANALYZE, BUFFERS) Query Plan Profiling...\n`);

  console.log(`--- [EXPLAIN 1: listJobs with Pre-aggregated Joins] ---`);
  const explainJobs: any = await db.execute(sql`
    EXPLAIN (ANALYZE, BUFFERS)
    SELECT
      j.id, j.job_number, j.complaint, j.status, j.created_at,
      c.name, c.phone,
      coalesce(i.total, '0') as total,
      coalesce(jp.c, 0)::int as parts_count,
      coalesce(jl.c, 0)::int as labour_count
    FROM jobs j
    INNER JOIN customers c ON j.customer_id = c.id
    LEFT JOIN vehicles v ON j.vehicle_id = v.id
    LEFT JOIN invoices i ON i.job_id = j.id
    LEFT JOIN (SELECT job_id, count(*)::int as c FROM job_parts GROUP BY job_id) jp ON jp.job_id = j.id
    LEFT JOIN (SELECT job_id, count(*)::int as c FROM job_labour GROUP BY job_id) jl ON jl.job_id = j.id
    ORDER BY j.created_at DESC
    LIMIT 100;
  `);
  for (const row of explainJobs.rows ?? explainJobs) {
    console.log(row["QUERY PLAN"] ?? Object.values(row)[0]);
  }

  console.log(`\n--- [EXPLAIN 2: listCustomers with Pre-aggregated Joins] ---`);
  const explainCustomers: any = await db.execute(sql`
    EXPLAIN (ANALYZE, BUFFERS)
    SELECT
      c.id, c.name, c.phone,
      coalesce(j.c, 0)::int as total_jobs,
      coalesce(i.due, '0') as outstanding
    FROM customers c
    LEFT JOIN (SELECT customer_id, count(*)::int as c FROM jobs GROUP BY customer_id) j ON j.customer_id = c.id
    LEFT JOIN (SELECT customer_id, coalesce(sum(due_amount), 0) as due FROM invoices WHERE status IN ('ISSUED', 'PARTIALLY_PAID') GROUP BY customer_id) i ON i.customer_id = c.id
    ORDER BY c.name
    LIMIT 50;
  `);
  for (const row of explainCustomers.rows ?? explainCustomers) {
    console.log(row["QUERY PLAN"] ?? Object.values(row)[0]);
  }

  console.log(`\n--- [EXPLAIN 3: Sequence generation nextval] ---`);
  const explainSeq: any = await db.execute(sql`
    EXPLAIN (ANALYZE, BUFFERS)
    SELECT nextval('job_number_seq');
  `);
  for (const row of explainSeq.rows ?? explainSeq) {
    console.log(row["QUERY PLAN"] ?? Object.values(row)[0]);
  }

  console.log(`\n✔ Load testing and performance profiling completed successfully.\n`);
  process.exit(0);
}

main().catch((err) => {
  console.error("Load test failed:", err);
  process.exit(1);
});
