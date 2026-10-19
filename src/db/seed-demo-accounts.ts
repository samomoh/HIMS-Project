import './load-local-env';
import { db } from './index';
import { users } from './schema';
import { hashPassword, ROLES } from '@/lib/auth';

async function seedDemoAccounts() {
  if (process.env.NODE_ENV === 'production' || process.env.ALLOW_DEMO_ACCOUNTS !== 'true') {
    throw new Error('Demo accounts require a non-production database and ALLOW_DEMO_ACCOUNTS=true.');
  }
  const password = process.env.DEMO_ACCOUNTS_PASSWORD;
  if (!password || password.length < 12) throw new Error('Set DEMO_ACCOUNTS_PASSWORD to a value of at least 12 characters.');
  const passwordHash = await hashPassword(password);
  const records = ROLES.map((role) => ({
    name: `Demo ${role.replaceAll('_', ' ')}`,
    email: `${role.replaceAll('_', '.')}@example.test`,
    role,
    passwordHash,
  }));
  await db.insert(users).values(records).onConflictDoNothing({ target: users.email });
  console.log(`Ensured ${records.length} sample role accounts exist. Existing accounts were not changed.`);
  process.exit(0);
}

seedDemoAccounts().catch((error) => {
  console.error(error instanceof Error ? error.message : 'Unable to seed demo accounts.');
  process.exit(1);
});
