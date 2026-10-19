import { createHash } from 'node:crypto';
import { lt, sql } from 'drizzle-orm';
import { db } from '@/db';
import { authRateLimits } from '@/db/schema';

let nextCleanupAt = 0;

export function rateLimitKey(...parts: string[]) {
  return createHash('sha256').update(parts.join('\u0000')).digest('hex');
}

/** Persistent per-identifier throttling shared across serverless instances. */
export async function consumeRateLimit(key: string, limit: number, windowMs: number): Promise<boolean> {
  const now = new Date();
  if (Date.now() >= nextCleanupAt) {
    nextCleanupAt = Date.now() + 60 * 60_000;
    await db.delete(authRateLimits).where(lt(authRateLimits.windowStarted, new Date(now.getTime() - 24 * 60 * 60_000)));
  }
  const windowStart = new Date(now.getTime() - windowMs);
  const lockUntil = new Date(now.getTime() + windowMs);
  const [row] = await db.insert(authRateLimits).values({ key, attempts: 1, windowStarted: now })
    .onConflictDoUpdate({
      target: authRateLimits.key,
      set: {
        attempts: sql`CASE WHEN ${authRateLimits.windowStarted} < ${windowStart} THEN 1 ELSE ${authRateLimits.attempts} + 1 END`,
        windowStarted: sql`CASE WHEN ${authRateLimits.windowStarted} < ${windowStart} THEN ${now} ELSE ${authRateLimits.windowStarted} END`,
        blockedUntil: sql`CASE WHEN ${authRateLimits.windowStarted} < ${windowStart} THEN NULL WHEN ${authRateLimits.attempts} + 1 >= ${limit} THEN ${lockUntil} ELSE ${authRateLimits.blockedUntil} END`,
      },
    }).returning({ blockedUntil: authRateLimits.blockedUntil });
  return row?.blockedUntil != null && row.blockedUntil > now;
}
