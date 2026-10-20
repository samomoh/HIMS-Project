import { createHash, createHmac, randomBytes, timingSafeEqual } from 'node:crypto';

export const SESSION_COOKIE = 'healthai_session';
export const SESSION_TTL_SECONDS = 60 * 60 * 8;
export const ROLES = [
  'super_admin', 'admin', 'doctor', 'specialist', 'nurse', 'receptionist',
  'pharmacist', 'laboratory', 'radiology', 'emergency', 'medical_records',
  'health_authority', 'ict_support', 'hr',
] as const;
export type Role = (typeof ROLES)[number];
export type SessionPayload = { uid: number; role: Role; exp: number; nonce: string; sv: number; ver: string };

function sessionSecret() {
  const secret = process.env.SESSION_SECRET;
  if (!secret || Buffer.byteLength(secret) < 32) throw new Error('SESSION_SECRET must be configured with at least 32 characters.');
  return secret;
}

function signature(payload: string) {
  return createHmac('sha256', sessionSecret()).update(payload).digest('base64url');
}

export function signSession(user: { id: number; role: string; passwordHash: string | null; sessionVersion: number }): string {
  if (!ROLES.includes(user.role as Role)) throw new Error('User role is not recognized.');
  const payload: SessionPayload = {
    uid: user.id,
    role: user.role as Role,
    exp: Math.floor(Date.now() / 1000) + SESSION_TTL_SECONDS,
    nonce: randomBytes(16).toString('base64url'),
    sv: user.sessionVersion,
    ver: createHash('sha256').update(user.passwordHash ?? '').digest('base64url').slice(0, 22),
  };
  const encoded = Buffer.from(JSON.stringify(payload)).toString('base64url');
  return `${encoded}.${signature(encoded)}`;
}

export function verifySession(token?: string | null): SessionPayload | null {
  if (!token) return null;
  const [encoded, supplied, extra] = token.split('.');
  if (!encoded || !supplied || extra) return null;
  try {
    const expected = Buffer.from(signature(encoded));
    const actual = Buffer.from(supplied);
    if (expected.length !== actual.length || !timingSafeEqual(expected, actual)) return null;
    const payload = JSON.parse(Buffer.from(encoded, 'base64url').toString('utf8')) as SessionPayload;
    if (!Number.isSafeInteger(payload.uid) || payload.uid <= 0 || !Number.isInteger(payload.exp) || payload.exp <= Date.now() / 1000 || !Number.isSafeInteger(payload.sv) || payload.sv < 0 || typeof payload.ver !== 'string') return null;
    if (!ROLES.includes(payload.role)) return null;
    return payload;
  } catch {
    return null;
  }
}
