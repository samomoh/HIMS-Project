import { count, eq, isNotNull } from 'drizzle-orm';
import { db } from './index';
import { users } from './schema';
import { hashPassword } from '../lib/auth';

async function bootstrapAdmin() {
  const email = process.env.BOOTSTRAP_ADMIN_EMAIL?.trim().toLowerCase();
  const password = process.env.BOOTSTRAP_ADMIN_PASSWORD;
  if (!email || !password) throw new Error('Set BOOTSTRAP_ADMIN_EMAIL and BOOTSTRAP_ADMIN_PASSWORD for this one-time operation.');
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || email.length > 255) throw new Error('BOOTSTRAP_ADMIN_EMAIL is invalid.');

  const passwordHash = await hashPassword(password);
  const [{ count: userCount }] = await db.select({ count: count() }).from(users);
  if (Number(userCount) === 0) {
    await db.insert(users).values({ name: 'System Administrator', email, passwordHash, role: 'super_admin' });
    console.log(`Created the initial super administrator: ${email}`);
  } else {
    const target = await db.query.users.findFirst({ where: (table, { eq }) => eq(table.email, email) });
    const [{ count: configuredAccounts }] = await db.select({ count: count() }).from(users).where(isNotNull(users.passwordHash));
    if (!target || !['admin', 'super_admin'].includes(target.role) || target.passwordHash || Number(configuredAccounts) > 0) {
      throw new Error('For an existing database, bootstrap can only set the password for one admin account when no account has a password yet.');
    }
    await db.update(users).set({ passwordHash }).where(eq(users.id, target.id));
    console.log(`Set the initial password for the existing administrator: ${email}`);
  }
  console.log('Unset BOOTSTRAP_ADMIN_PASSWORD after this one-time operation.');
}

bootstrapAdmin().catch((error) => {
  console.error('Admin bootstrap failed:', error instanceof Error ? error.message : 'unknown error');
  process.exitCode = 1;
});
