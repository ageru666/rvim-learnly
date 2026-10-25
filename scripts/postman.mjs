// Runs the Postman collection with Newman against a freshly seeded server (lab 3, FR-API-3).
// Newman is not a dependency: it pulls known-vulnerable transitive packages, so a pinned version runs via npx.
import { execSync } from 'node:child_process';
import { ROOT, seedDatabase, seededServerEnv, startServer, stopServer, waitForHealth } from './lib/seeded-server.mjs';

const NEWMAN = 'newman@6.2.3';
const { env, baseUrl } = seededServerEnv('postman', 3199);

seedDatabase(env);
const server = startServer(env);

let exitCode = 1;
try {
  await waitForHealth(baseUrl);
  execSync(
    `npx --yes ${NEWMAN} run docs/api/learnly.postman_collection.json ` +
      `-e docs/api/learnly.postman_environment.json --env-var baseUrl=${baseUrl}`,
    { cwd: ROOT, env, stdio: 'inherit' },
  );
  exitCode = 0;
} catch (error) {
  console.error(error instanceof Error ? error.message : error);
} finally {
  stopServer(server);
}
process.exit(exitCode);
