// Load check (SC-003, lab 4). Without arguments: a freshly seeded server in production mode, 10 concurrent
// clients per URL, p95 latency within budget. With `--url`: an already deployed server, measured politely.
//   npm run perf                                   local budget check (exit code 1 when over budget)
//   npm run perf -- --url https://example.com      a deployment: latency at 4 req/s, under its rate limit
//   npm run perf -- --url … --rate 0 --connections 10 --duration 20   full load (raise the rate limit first)
// Plain fetch with keep-alive instead of autocannon, whose dependency tree has a known-vulnerable package; the
// numbers are measured end to end, including reading the body.
import { performance } from 'node:perf_hooks';
import { parseArgs } from 'node:util';
import { seedDatabase, seededServerEnv, startServer, stopServer, waitForHealth } from './lib/seeded-server.mjs';

const { values: args } = parseArgs({
  options: {
    url: { type: 'string' },
    connections: { type: 'string' },
    duration: { type: 'string' },
    rate: { type: 'string' },
    json: { type: 'boolean', default: false },
  },
});

const remote = args.url !== undefined;
// A deployment allows 300 requests a minute per IP (docs/security-notes.md); 4 req/s stays under it.
const CONNECTIONS = Number(args.connections ?? (remote ? 4 : 10));
const DURATION_MS = Number(args.duration ?? (remote ? 20 : 10)) * 1000;
const RATE = Number(args.rate ?? (remote ? 4 : 0));
const WARMUP_MS = 1_000;
const PAGE_BUDGET_MS = 300;
const API_BUDGET_MS = 200;

function percentile(sorted, fraction) {
  return sorted[Math.min(sorted.length - 1, Math.ceil(fraction * sorted.length) - 1)];
}

async function timedGet(url) {
  const sent = performance.now();
  const response = await fetch(url, { headers: { 'accept-language': 'uk' } });
  await response.arrayBuffer();
  return { ms: performance.now() - sent, status: response.status };
}

/** Keeps CONNECTIONS requests in flight (at most RATE per second when set); latencies after the warm-up. */
async function load(url) {
  const latencies = [];
  const statuses = new Map();
  const started = performance.now();
  const deadline = started + WARMUP_MS + DURATION_MS;
  let nextSlot = started;
  async function client() {
    while (performance.now() < deadline) {
      if (RATE > 0) {
        const wait = nextSlot - performance.now();
        nextSlot = Math.max(nextSlot, performance.now()) + 1000 / RATE;
        if (wait > 0) await new Promise((done) => setTimeout(done, wait));
        if (performance.now() >= deadline) break;
      }
      const sent = performance.now();
      let status = 'error';
      try {
        status = (await timedGet(url)).status;
      } catch {
        // Counted below as a failed request.
      }
      statuses.set(status, (statuses.get(status) ?? 0) + 1);
      if (sent - started >= WARMUP_MS) latencies.push(performance.now() - sent);
    }
  }
  await Promise.all(Array.from({ length: CONNECTIONS }, client));
  latencies.sort((a, b) => a - b);
  const failed = [...statuses].filter(([status]) => status !== 200).reduce((sum, [, count]) => sum + count, 0);
  return {
    requests: latencies.length,
    perSecond: latencies.length / (DURATION_MS / 1000),
    p50: percentile(latencies, 0.5),
    p95: percentile(latencies, 0.95),
    max: latencies.at(-1),
    failed,
    statuses: Object.fromEntries(statuses),
  };
}

async function measure(baseUrl) {
  const catalog = await (await fetch(`${baseUrl}/api/v1/courses?limit=1`)).json();
  const slug = catalog.items[0]?.slug;
  if (!slug) throw new Error('the catalog is empty');
  const targets = [
    { path: '/courses', budget: PAGE_BUDGET_MS },
    { path: `/courses/${slug}`, budget: PAGE_BUDGET_MS },
    { path: '/api/v1/courses', budget: API_BUDGET_MS },
  ];
  const results = [];
  const pace = RATE > 0 ? `at most ${RATE} req/s` : 'no rate cap';
  console.log(`${baseUrl}: ${CONNECTIONS} connections, ${pace}, ${DURATION_MS / 1000} s per URL after a ${WARMUP_MS / 1000} s warm-up`);
  for (const { path, budget } of targets) {
    const result = { path, budget, ...(await load(`${baseUrl}${path}`)) };
    results.push(result);
    console.log(
      `${path.padEnd(48)} ${result.perSecond.toFixed(1).padStart(6)} req/s  p50 ${result.p50.toFixed(1).padStart(7)} ms  ` +
        `p95 ${result.p95.toFixed(1).padStart(7)} ms  max ${result.max.toFixed(0).padStart(5)} ms` +
        (result.failed > 0 ? `  failed ${result.failed} ${JSON.stringify(result.statuses)}` : ''),
    );
  }
  return results;
}

let exitCode = 1;
if (remote) {
  const baseUrl = args.url.replace(/\/$/, '');
  try {
    // The first request after idle wakes a sleeping free instance or a cold serverless function.
    const first = await timedGet(`${baseUrl}/health`);
    console.log(`first request (/health, possibly cold): ${first.ms.toFixed(0)} ms, status ${first.status}`);
    const results = await measure(baseUrl);
    if (args.json) console.log(JSON.stringify({ baseUrl, coldMs: first.ms, connections: CONNECTIONS, rate: RATE, results }));
    exitCode = results.some((result) => result.failed > 0) ? 1 : 0;
  } catch (error) {
    console.error(error instanceof Error ? error.message : error);
  }
} else {
  const seeded = seededServerEnv('perf', 3197);
  // One machine plays every client, so the per-IP limits for a single person would turn the run into 429s.
  const env = { ...seeded.env, NODE_ENV: 'production', RATE_LIMIT_GLOBAL_PER_MIN: '1000000', RATE_LIMIT_AUTH_PER_MIN: '10000' };
  seedDatabase(env);
  const server = startServer(env);
  try {
    await waitForHealth(seeded.baseUrl);
    const results = await measure(seeded.baseUrl);
    const failures = results.flatMap((result) => [
      ...(result.failed > 0 ? [`${result.path}: ${result.failed} failed requests`] : []),
      ...(result.p95 >= result.budget ? [`${result.path}: p95 ${result.p95.toFixed(1)} ms is over ${result.budget} ms`] : []),
    ]);
    for (const failure of failures) console.error(`FAIL: ${failure}`);
    exitCode = failures.length === 0 ? 0 : 1;
  } catch (error) {
    console.error(error instanceof Error ? error.message : error);
  } finally {
    stopServer(server);
  }
}
process.exit(exitCode);
