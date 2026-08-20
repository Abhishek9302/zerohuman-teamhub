import { Pool, type PoolConfig } from 'pg';

const databaseUrl = process.env.DATABASE_URL;

if (!databaseUrl) {
  throw new Error('DATABASE_URL is required.');
}

/**
 * Enable TLS when connecting to managed Postgres (e.g. AWS RDS). These providers
 * present certificates signed by their own CAs, so we require encryption in
 * transit while allowing the managed CA chain. Local/dev URLs stay plaintext.
 */
function shouldUseSsl(url: string): boolean {
  if (/sslmode=require/i.test(url)) {
    return true;
  }
  return /\.rds\.amazonaws\.com|\.amazonaws\.com/i.test(url);
}

const poolConfig: PoolConfig = {
  connectionString: databaseUrl,
  // Bound the pool so a burst of traffic cannot exhaust database connections.
  max: Number(process.env.PG_POOL_MAX || 10),
  idleTimeoutMillis: 30_000,
  connectionTimeoutMillis: 10_000
};

if (shouldUseSsl(databaseUrl)) {
  poolConfig.ssl = { rejectUnauthorized: false };
}

export const pool = new Pool(poolConfig);

// Prevent an idle-client error from crashing the process.
pool.on('error', (error) => {
  console.error('UNEXPECTED_PG_POOL_ERROR', error);
});
