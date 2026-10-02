import { Pool, PoolClient, QueryResultRow } from "pg";

const globalForPg = globalThis as unknown as { pgPool?: Pool };

export const pool =
  globalForPg.pgPool ??
  new Pool({
    host: process.env.DB_HOST,
    port: Number(process.env.DB_PORT ?? 5432),
    database: process.env.DB_NAME,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    max: 10,
  });

if (process.env.NODE_ENV !== "production") globalForPg.pgPool = pool;

export async function query<T extends QueryResultRow = any>(
  text: string,
  params?: unknown[]
): Promise<T[]> {
  const res = await pool.query<T>(text, params);
  return res.rows;
}

export async function queryOne<T extends QueryResultRow = any>(
  text: string,
  params?: unknown[]
): Promise<T | null> {
  const rows = await query<T>(text, params);
  return rows[0] ?? null;
}

export async function withTransaction<T>(
  fn: (client: PoolClient) => Promise<T>
): Promise<T> {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const result = await fn(client);
    await client.query("COMMIT");
    return result;
  } catch (err) {
    await client.query("ROLLBACK");
    throw err;
  } finally {
    client.release();
  }
}