import { describe, expect, it } from 'vitest';
import { pgPoolConfig } from '../../src/lib/pgConfig.js';

const BASE = 'postgresql://user:secret@db.example.com:5432/learnly';

describe('pgPoolConfig', () => {
  it('connects without TLS when the URL asks for none', () => {
    expect(pgPoolConfig(BASE)).toEqual({ connectionString: BASE });
    expect(pgPoolConfig(`${BASE}?sslmode=disable`)).toEqual({ connectionString: BASE });
  });

  it('reads sslmode like libpq: require encrypts, verify-full also checks the certificate', () => {
    expect(pgPoolConfig(`${BASE}?sslmode=require`)).toEqual({ connectionString: BASE, ssl: { rejectUnauthorized: false } });
    expect(pgPoolConfig(`${BASE}?sslmode=verify-full`)).toEqual({ connectionString: BASE, ssl: { rejectUnauthorized: true } });
  });

  it('keeps the other parameters of the URL', () => {
    expect(pgPoolConfig(`${BASE}?sslmode=require&application_name=learnly`).connectionString).toBe(`${BASE}?application_name=learnly`);
  });
});
