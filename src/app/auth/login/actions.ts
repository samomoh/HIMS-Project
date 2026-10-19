'use server';

import { cookies, headers as requestHeaders } from 'next/headers';
import { eq, inArray, sql } from 'drizzle-orm';
import { db } from '@/db';
import { authRateLimits, users } from '@/db/schema';
import { currentUser, SESSION_COOKIE, SESSION_TTL_SECONDS, signSession, verifyPassword } from '@/lib/auth';
import { consumeRateLimit, rateLimitKey } from '@/lib/rate-limit';

export async function signInAction(email: string, password: string) {
  const normalizedEmail = email.trim().toLowerCase();
  if (!normalizedEmail || normalizedEmail.length > 255 || !password || password.length > 1024) {
    return { success: false, message: 'Email or password is incorrect.' };
  }
  const headerBag = await requestHeaders();
  const clientIp = headerBag.get('x-nf-client-connection-ip') ?? headerBag.get('cf-connecting-ip') ?? 'unknown';
  const [emailLimited, clientLimited] = await Promise.all([
    consumeRateLimit(rateLimitKey('login-email', normalizedEmail), 11, 15 * 60_000),
    consumeRateLimit(rateLimitKey('login-client', normalizedEmail, clientIp), 6, 15 * 60_000),
  ]);
  if (emailLimited || clientLimited) return { success: false, message: 'Email or password is incorrect.' };
  const user = await db.query.users.findFirst({ where: eq(users.email, normalizedEmail) });
  const dummyHash = `scrypt$32768$${Buffer.alloc(16).toString('base64url')}$${Buffer.alloc(64).toString('base64url')}`;
  const valid = await verifyPassword(password, user?.passwordHash ?? dummyHash);
  if (!user || !valid) return { success: false, message: 'Email or password is incorrect.' };

  await db.delete(authRateLimits).where(inArray(authRateLimits.key, [
    rateLimitKey('login-email', normalizedEmail),
    rateLimitKey('login-client', normalizedEmail, clientIp),
  ]));

  const jar = await cookies();
  jar.set(SESSION_COOKIE, signSession(user), {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: SESSION_TTL_SECONDS,
  });
  return { success: true };
}

export async function signOutAction() {
  const jar = await cookies();
  try {
    const user = await currentUser();
    if (user) await db.update(users).set({ sessionVersion: sql`${users.sessionVersion} + 1` }).where(eq(users.id, user.id));
  } finally {
    jar.delete(SESSION_COOKIE);
  }
}
