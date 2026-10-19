'use server';

import { db } from '@/db';
import { users, systemSettings } from '@/db/schema';
import { eq } from 'drizzle-orm';
import { revalidatePath } from 'next/cache';
import { logAuditTrail } from '@/lib/audit';
import { requireUser } from '@/lib/auth';

export async function updateProfileSettingsAction(userId: number, name: string, email: string) {
  const actor = await requireUser();
  const normalizedEmail = email.trim().toLowerCase();
  if (!name.trim() || name.length > 255 || normalizedEmail.length > 255 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail)) throw new Error('Enter a valid name and email address.');
  await db.update(users).set({
    name: name.trim(),
    email: normalizedEmail,
  }).where(eq(users.id, actor.id));
  
  await logAuditTrail(actor.id, 'Updated Profile', 'Settings', `User updated their profile details`);
  revalidatePath('/settings');
}

export async function updateSystemSettingsAction(userId: number, settings: { key: string, value: string }[]) {
  const actor = await requireUser(['super_admin', 'admin']);
  if (settings.length > 100 || settings.some((setting) => !setting.key.trim() || setting.key.length > 100 || setting.value.length > 10000)) throw new Error('Invalid system settings.');
  // Upsert settings
  for (const setting of settings) {
    await db.insert(systemSettings).values({
      settingKey: setting.key,
      settingValue: setting.value,
    }).onConflictDoUpdate({
      target: systemSettings.settingKey,
      set: { settingValue: setting.value, updatedAt: new Date() }
    });
  }

  await logAuditTrail(actor.id, 'Updated System Configurations', 'Settings', `Updated global system configurations`);
  revalidatePath('/settings');
}
