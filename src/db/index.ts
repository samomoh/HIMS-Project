import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import * as schema from "./schema";

/**
 * Lazy database client.
 *
 * IMPORTANT: this module must NOT read env vars or open connections at import
 * time. `next build` imports every route/page module while "collecting page
 * data", and on CI providers (Netlify, Vercel, etc.) DATABASE_URL is often not
 * present during the build step. An import-time throw here is exactly what
 * breaks those builds. Instead we construct the pool on the FIRST QUERY, at
 * request time, when the runtime environment is fully populated.
 */

type Database = ReturnType<typeof drizzle<typeof schema>>;

const globalForDb = globalThis as typeof globalThis & {
  __hmisPool?: Pool;
  __hmisDb?: Database;
};

function createDb(): Database {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    throw new Error(
      "DATABASE_URL is not set. Configure it in your runtime environment " +
        "(e.g. Netlify: Site configuration → Environment variables). " +
        "It is only required when a request actually touches the database — never at build time."
    );
  }

  const pool =
    globalForDb.__hmisPool ??
    new Pool({
      connectionString: databaseUrl,
      // Managed Postgres providers (Neon, Supabase, RDS…) typically require TLS;
      // local docker/postgres does not. Keep certificate verification enabled.
      ssl:
        process.env.DATABASE_SSL === "true" || process.env.PGSSLMODE === "require"
          ? { rejectUnauthorized: true }
          : undefined,
    });

  const client = drizzle(pool, { schema });

  // Cache across hot reloads (dev) and across lambda invocations that share a
  // warm sandbox (serverless), so we never leak pools.
  globalForDb.__hmisPool = pool;
  globalForDb.__hmisDb = client;
  return client;
}

function getDb(): Database {
  return globalForDb.__hmisDb ?? createDb();
}

/**
 * A transparent proxy with the exact same surface as the real drizzle client.
 * Property access triggers lazy initialisation; until then, importing this
 * module is completely side-effect free.
 */
export const db: Database = new Proxy({} as Database, {
  get(_target, prop, _receiver) {
    const real = getDb() as unknown as Record<PropertyKey, unknown>;
    const value = real[prop];
    return typeof value === "function" ? (value as (...a: unknown[]) => unknown).bind(real) : value;
  },
  has(_target, prop) {
    return prop in (getDb() as object);
  },
});

/** Lazy accessor for the raw pg pool (only needed for low-level operations). */
export function getPool(): Pool {
  getDb();
  return globalForDb.__hmisPool!;
}
