import { createHash, scrypt as scryptCallback, randomBytes, timingSafeEqual } from 'node:crypto';
import { cookies } from 'next/headers';
import { db } from '@/db';
import { users } from '@/db/schema';
import { eq } from 'drizzle-orm';
import { Role, ROLES, SESSION_COOKIE, SESSION_TTL_SECONDS, signSession, verifySession } from '@/lib/session-token';

function deriveKey(password: string, salt: Buffer, length: number, cost: number, maxmem: number) {
  return new Promise<Buffer>((resolve, reject) => {
    scryptCallback(password, salt, length, { N: cost, r: 8, p: 1, maxmem }, (error, result) => {
      if (error) reject(error);
      else resolve(result as Buffer);
    });
  });
}
export { ROLES, SESSION_COOKIE, SESSION_TTL_SECONDS, signSession, verifySession };
export type { Role };
export type AuthenticatedUser = {
  id: number; name: string; email: string; role: Role;
  department: string | null; contactNumber: string | null;
};

export async function hashPassword(password: string): Promise<string> {
  if (password.length < 12 || Buffer.byteLength(password) > 1024) {
    throw new Error('Password must be at least 12 characters and no more than 1024 bytes.');
  }
  const salt = randomBytes(16);
  const cost = 1 << 15;
  const derived = await deriveKey(password, salt, 64, cost, 64 * 1024 * 1024);
  return `scrypt$${cost}$${salt.toString('base64url')}$${derived.toString('base64url')}`;
}

export async function verifyPassword(password: string, stored: string | null): Promise<boolean> {
  if (!stored || Buffer.byteLength(password) > 1024) return false;
  const [algorithm, costText, saltText, hashText] = stored.split('$');
  const cost = Number(costText);
  if (algorithm !== 'scrypt' || ![1 << 14, 1 << 15, 1 << 16, 1 << 17].includes(cost) || !saltText || !hashText) return false;
  try {
    const salt = Buffer.from(saltText, 'base64url');
    const expected = Buffer.from(hashText, 'base64url');
    if (!salt.length || expected.length !== 64) return false;
    const actual = await deriveKey(password, salt, expected.length, cost, 256 * 1024 * 1024);
    return timingSafeEqual(actual, expected);
  } catch {
    return false;
  }
}

export const hashResetToken = (token: string) => createHash('sha256').update(token).digest('hex');

export async function currentUser(): Promise<AuthenticatedUser | null> {
  const token = (await cookies()).get(SESSION_COOKIE)?.value;
  const session = verifySession(token);
  if (!session) return null;
  const user = await db.query.users.findFirst({ where: eq(users.id, session.uid) });
  if (!user || user.role !== session.role || !ROLES.includes(user.role as Role) || session.ver !== createHash('sha256').update(user.passwordHash ?? '').digest('base64url').slice(0, 22)) return null;
  return {
    id: user.id, name: user.name, email: user.email, role: user.role as Role,
    department: user.department, contactNumber: user.contactNumber,
  };
}

export async function requireUser(roles?: readonly Role[]): Promise<AuthenticatedUser> {
  const user = await currentUser();
  if (!user) throw new Error('Authentication required.');
  if (roles && !roles.includes(user.role)) throw new Error('You do not have permission to perform this action.');
  return user;
}
