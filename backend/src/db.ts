import { Pool } from "pg";

const connectionString = process.env.DATABASE_URL || "postgresql://paperclip:paperclip@localhost:5432/paperclip";

// Enable SSL when talking to a managed cloud Postgres (RDS/Aurora/etc).
const needsSsl = /rds\.amazonaws\.com|amazonaws\.com|\bsslmode=require\b/.test(connectionString);

export const pool = new Pool({
  connectionString,
  ssl: needsSsl ? { rejectUnauthorized: false } : undefined,
});

export async function query<T = any>(text: string, params: any[] = []): Promise<T[]> {
  const res = await pool.query(text, params);
  return res.rows as T[];
}
