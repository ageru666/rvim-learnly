import type { PoolConfig } from 'pg';

/**
 * Pool options for a connection string, reading `sslmode` the way libpq (and so the Prisma CLI) does: `require`
 * encrypts without checking the certificate, `verify-ca` and `verify-full` also check it against the trusted CAs.
 * node-postgres would treat `require` as `verify-full`, which fails on providers with their own CA (Supabase), so
 * the mode is taken out of the URL and passed as an explicit `ssl` option.
 */
export function pgPoolConfig(connectionString: string): PoolConfig {
  const url = new URL(connectionString);
  const mode = url.searchParams.get('sslmode');
  url.searchParams.delete('sslmode');
  if (!mode || mode === 'disable') return { connectionString: url.toString() };
  return { connectionString: url.toString(), ssl: { rejectUnauthorized: mode === 'verify-ca' || mode === 'verify-full' } };
}
