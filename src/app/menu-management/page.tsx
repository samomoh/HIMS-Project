import { redirect } from 'next/navigation';
import { eq } from 'drizzle-orm';
import { db } from '@/db';
import { systemSettings } from '@/db/schema';
import { currentUser } from '@/lib/auth';
import { MENU_SETTING_KEY, sanitizeCustomMenu } from '@/lib/custom-navigation';
import MenuManagementClient from './MenuManagementClient';

export const dynamic = 'force-dynamic';

export default async function MenuManagementPage() {
  const actor = await currentUser();
  if (!actor || !['super_admin', 'admin'].includes(actor.role)) redirect('/unauthorized');
  const row = await db.query.systemSettings.findFirst({ where: eq(systemSettings.settingKey, MENU_SETTING_KEY) });
  let parsed: unknown = [];
  try { parsed = row?.settingValue ? JSON.parse(row.settingValue) : []; } catch { parsed = []; }
  return <MenuManagementClient initialItems={sanitizeCustomMenu(parsed)} />;
}
