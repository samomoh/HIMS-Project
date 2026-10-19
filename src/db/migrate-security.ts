import './load-local-env';
import { getPool } from './index';

async function migrate() {
  const pool = getPool();
  try {
    await pool.query(`
      ALTER TABLE users ADD COLUMN IF NOT EXISTS session_version integer NOT NULL DEFAULT 0;
    `);
    await pool.query(`
      CREATE TABLE IF NOT EXISTS auth_rate_limits (
        key varchar(255) PRIMARY KEY,
        attempts integer NOT NULL DEFAULT 0,
        window_started timestamp NOT NULL,
        blocked_until timestamp
      );
      CREATE INDEX IF NOT EXISTS auth_rate_limits_blocked_until_idx
        ON auth_rate_limits (blocked_until);
    `);
    console.log('Security migration complete.');
  } finally {
    await pool.end();
  }
}

migrate().catch((error) => {
  console.error('Security migration failed:', error instanceof Error ? error.message : 'unknown error');
  process.exitCode = 1;
});
