'use server';

import { randomBytes } from 'node:crypto';
import { and, eq, gt } from 'drizzle-orm';
import { headers as requestHeaders } from 'next/headers';
import { db } from '@/db';
import { users } from '@/db/schema';
import { hashPassword, hashResetToken } from '@/lib/auth';
import { logAuditTrail } from '@/lib/audit';
import { consumeRateLimit, rateLimitKey } from '@/lib/rate-limit';

const genericMessage = 'If an account with that email exists, a reset link will be sent.';

export async function requestPasswordResetAction(email: string) {
  const normalizedEmail = typeof email === 'string' ? email.trim().toLowerCase() : '';
  if (!normalizedEmail || normalizedEmail.length > 255) return { success: true, message: genericMessage };
  if (await consumeRateLimit(rateLimitKey('password-reset', normalizedEmail), 4, 60 * 60_000)) return { success: true, message: genericMessage };

  const user = await db.query.users.findFirst({ where: eq(users.email, normalizedEmail) });
  if (!user) return { success: true, message: genericMessage };

  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.RESET_EMAIL_FROM;
  let origin = '';
  try {
    const configuredUrl = new URL(process.env.APP_URL ?? '');
    const localDevelopment = process.env.NODE_ENV !== 'production' && configuredUrl.hostname === 'localhost' && configuredUrl.protocol === 'http:';
    if ((configuredUrl.protocol === 'https:' || localDevelopment) && configuredUrl.pathname === '/') origin = configuredUrl.origin;
  } catch { /* Keep reset behavior indistinguishable when configuration is incomplete. */ }
  if (!apiKey || !from || !origin) {
    console.error('Password reset email is not configured; no reset link was sent.');
    return { success: true, message: genericMessage };
  }

  const token = randomBytes(32).toString('base64url');
  const expiry = new Date(Date.now() + 30 * 60 * 1000);
  await db.update(users).set({ resetToken: hashResetToken(token), resetTokenExpiry: expiry }).where(eq(users.id, user.id));
  const resetUrl = `${origin}/auth/reset-password?token=${encodeURIComponent(token)}`;

  try {
    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        from,
        to: [user.email],
        subject: 'Reset your HealthAI password',
        text: `A password reset was requested for your HealthAI account. Use this link within 30 minutes:\n\n${resetUrl}\n\nIf you did not request this, you can ignore this email.`,
      }),
      signal: AbortSignal.timeout(10_000),
    });
    if (!response.ok) throw new Error(`Email service returned ${response.status}.`);
    await logAuditTrail(user.id, 'Requested Password Reset', 'Authentication', 'Password reset email sent.');
  } catch (error) {
    await db.update(users).set({ resetToken: null, resetTokenExpiry: null }).where(eq(users.id, user.id));
    console.error('Password reset email could not be sent.', error);
  }
  return { success: true, message: genericMessage };
}

export async function verifyAndResetPasswordAction(token: string, newPassword: string) {
  if (typeof token !== 'string' || token.length < 32 || token.length > 128) {
    return { success: false, message: 'This reset link is invalid or has expired.' };
  }
  const headerBag = await requestHeaders();
  const clientIp = headerBag.get('x-nf-client-connection-ip') ?? headerBag.get('cf-connecting-ip') ?? 'unknown';
  if (await consumeRateLimit(rateLimitKey('password-reset-submit', clientIp), 21, 15 * 60_000)) {
    return { success: false, message: 'Too many reset attempts. Please wait and try again.' };
  }
  const tokenHash = hashResetToken(token);
  const validToken = await db.query.users.findFirst({ where: and(eq(users.resetToken, tokenHash), gt(users.resetTokenExpiry, new Date())) });
  if (!validToken) return { success: false, message: 'This reset link is invalid or has expired.' };

  let passwordHash: string;
  try {
    passwordHash = await hashPassword(newPassword);
  } catch (error) {
    return { success: false, message: error instanceof Error ? error.message : 'Password does not meet the requirements.' };
  }

  const [user] = await db.update(users).set({ passwordHash, resetToken: null, resetTokenExpiry: null })
    .where(and(eq(users.id, validToken.id), eq(users.resetToken, tokenHash), gt(users.resetTokenExpiry, new Date())))
    .returning({ id: users.id });
  if (!user) return { success: false, message: 'This reset link is invalid or has expired.' };

  await logAuditTrail(user.id, 'Completed Password Reset', 'Authentication', 'Password successfully reset.');
  return { success: true, message: 'Password has been reset. You can now sign in.' };
}
