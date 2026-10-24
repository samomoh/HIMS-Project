'use server';

import { eq } from 'drizzle-orm';
import { revalidatePath } from 'next/cache';
import { randomUUID } from 'node:crypto';
import { db } from '@/db';
import { systemSettings } from '@/db/schema';
import { logAuditTrail } from '@/lib/audit';
import { requireUser } from '@/lib/auth';
import { MENU_ICONS, MENU_SETTING_KEY, MENU_TARGETS, sanitizeCustomMenu, type CustomMenuItem, type MenuIconName } from '@/lib/custom-navigation';
import type { Role } from '@/lib/session-token';

export async function saveCustomMenuAction(input: unknown) {
  const actor = await requireUser(['super_admin', 'admin']);
  if (!Array.isArray(input) || input.length > 20) throw new Error('Add up to 20 menu links.');
  const entries: CustomMenuItem[] = input.map((raw) => {
    if (!raw || typeof raw !== 'object') throw new Error('A menu link is invalid.');
    const item = raw as Record<string, unknown>;
    const name = typeof item.name === 'string' ? item.name.trim() : '';
    const target = MENU_TARGETS.find((candidate) => candidate.href === item.href);
    const icon = item.icon as MenuIconName;
    if (!name || name.length > 40) throw new Error('Menu names must be 1 to 40 characters.');
    if (!target) throw new Error('Choose a valid existing module.');
    if (!MENU_ICONS.includes(icon)) throw new Error('Choose a valid menu icon.');
    if (!Array.isArray(item.roles) || item.roles.length === 0 || item.roles.some((role) => !(target.roles as readonly Role[]).includes(role as Role))) {
      throw new Error('Choose at least one role that already has access to this module.');
    }
    return { id: typeof item.id === 'string' && item.id ? item.id : randomUUID(), name, href: target.href, icon, roles: [...new Set(item.roles as Role[])] };
  });
  if (new Set(entries.map((item) => item.id)).size !== entries.length) throw new Error('Menu link identifiers must be unique.');
  await db.insert(systemSettings).values({ settingKey: MENU_SETTING_KEY, settingValue: JSON.stringify(entries), description: 'Admin-managed sidebar links' })
    .onConflictDoUpdate({ target: systemSettings.settingKey, set: { settingValue: JSON.stringify(entries), description: 'Admin-managed sidebar links', updatedAt: new Date() } });
  await logAuditTrail(actor.id, 'Updated Custom Menu', 'Menu Management', `Saved ${entries.length} custom menu link(s).`);
  revalidatePath('/', 'layout');
  revalidatePath('/menu-management');
  return { success: true };
}
