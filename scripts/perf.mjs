// Load check (SC-003) against a freshly seeded server in production mode: 10 concurrent clients per URL,
// p95 latency within budget. Plain fetch with keep-alive instead of autocannon, whose dependency tree has a
// known-vulnerable package; the numbers are measured end to end, including reading the body.
import { performance } from 'node:perf_hooks';
import { seedDatabase, seededServerEnv, startServer, stopServer, waitForHealth } from './lib/seeded-server.mjs';

const CONNECTIONS = 10;
const WARMUP_MS = 1_000;
const DURATION_MS = 10_000;
const PAGE_BUDGET_MS = 300;
const API_BUDGET_MS = 200;

const seeded = seededServerEnv('perf', 3197);
// One machine plays every client, so the per-IP limits for a single person would turn the run into 429s.
const env = { ...seeded.env, NODE_ENV: 'production', RATE_LIMIT_GLOBAL_PER_MIN: '1000000', RATE_LIMIT_AUTH_PER_MIN: '10000' };
const { baseUrl } = seeded;

function percentile(sorted, fraction) {
  return sorted[Math.min(sorted.length - 1, Math.ceil(fraction * sorted.length) - 1)];
}

/** Keeps CONNECTIONS requests in flight until the deadline; returns the latencies after the warm-up. */
async function load(url) {
  const latencies = [];
  let errors = 0;
  const started = performance.now();
  const deadline = started + WARMUP_MS + DURATION_MS;
  async function client() {
    while (performance.now() < deadline) {
      const sent = performance.now();
      try {
        const response = await fetch(url, { headers: { 'accept-language': 'uk' } });
        await response.arrayBuffer();
        if (!response.ok) errors++;
      } catch {
        errors++;
      }
      if (sent - started >= WARMUP_MS) latencies.push(performance.now() - sent);
    }
  }
  await Promise.all(Array.from({ length: CONNECTIONS }, client));
  latencies.sort((a, b) => a - b);
  return { count: latencies.length, errors, p50: percentile(latencies, 0.5), p95: percentile(latencies, 0.95), seconds: DURATION_MS / 1000 };
}

seedDatabase(env);
const server = startServer(env);
let exitCode = 1;
try {
  await waitForHealth(baseUrl);
  const catalog = await (await fetch(`${baseUrl}/api/v1/courses?limit=1`)).json();
  const slug = catalog.items[0]?.slug;
  if (!slug) throw new Error('the seeded catalog is empty');

  const targets = [
    { url: '/courses', budget: PAGE_BUDGET_MS },
    { url: `/courses/${slug}`, budget: PAGE_BUDGET_MS },
    { url: '/api/v1/courses', budget: API_BUDGET_MS },
  ];
  const failures = [];
  console.log(`${CONNECTIONS} connections, ${DURATION_MS / 1000} s per URL after a ${WARMUP_MS / 1000} s warm-up`);
  for (const { url, budget } of targets) {
    const result = await load(`${baseUrl}${url}`);
    const line = `${url.padEnd(48)} ${String(Math.round(result.count / result.seconds)).padStart(5)} req/s  p50 ${result.p50.toFixed(1).padStart(6)} ms  p95 ${result.p95.toFixed(1).padStart(6)} ms  (budget ${budget} ms)`;
    console.log(line);
    if (result.errors > 0) failures.push(`${url}: ${result.errors} failed requests`);
    if (result.p95 >= budget) failures.push(`${url}: p95 ${result.p95.toFixed(1)} ms is over ${budget} ms`);
  }
  for (const failure of failures) console.error(`FAIL: ${failure}`);
  exitCode = failures.length === 0 ? 0 : 1;
} catch (error) {
  console.error(error instanceof Error ? error.message : error);
} finally {
  stopServer(server);
}
process.exit(exitCode);
