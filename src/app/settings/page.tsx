import { db } from '@/db';
import { systemSettings } from '@/db/schema';
import { currentUser } from '@/lib/auth';
import SettingsClient from './SettingsClient';

export const dynamic = 'force-dynamic';

export default async function SettingsPage() {
  const actor = await currentUser();
  const canManageSystem = actor?.role === 'super_admin' || actor?.role === 'admin';
  const settingsRecords = canManageSystem ? await db.query.systemSettings.findMany() : [];
  
  // Transform settings array into a key-value object
  const settingsObj: Record<string, string> = {};
  settingsRecords.forEach(s => {
    if (s.settingValue) {
      settingsObj[s.settingKey] = s.settingValue;
    }
  });

  return (
    <div className="space-y-6 max-w-4xl">
      <div>
        <h1 className="text-2xl font-bold leading-6 text-gray-900">Settings</h1>
        <p className="mt-2 text-sm text-gray-700">
          Manage your account settings, preferences, and global system configurations.
        </p>
      </div>

      <SettingsClient 
        currentUser={actor} 
        initialSettings={settingsObj} 
        canManageSystem={canManageSystem}
      />
    </div>
  );
}
