'use client';

import { useState } from 'react';
import { User, Shield, Bell, Settings as SettingsIcon, Save } from 'lucide-react';
import Link from 'next/link';
import { updateProfileSettingsAction, updateSystemSettingsAction } from './actions';

export default function SettingsClient({ 
  currentUser, 
  initialSettings,
  canManageSystem,
}: { 
  currentUser: any;
  initialSettings: Record<string, string>;
  canManageSystem: boolean;
}) {
  const [activeTab, setActiveTab] = useState<'Profile' | 'Security' | 'Notifications' | 'System'>('Profile');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Profile Form State
  const [profileName, setProfileName] = useState(currentUser?.name || '');
  const [profileEmail, setProfileEmail] = useState(currentUser?.email || '');

  // System Settings State
  const [systemName, setSystemName] = useState(initialSettings['HOSPITAL_NAME'] || 'HealthAI HMIS');
  const [systemEmail, setSystemEmail] = useState(initialSettings['HOSPITAL_EMAIL'] || 'contact@healthai.com');
  const [maxAppointments, setMaxAppointments] = useState(initialSettings['MAX_DAILY_APPOINTMENTS'] || '50');
  const [maintenanceMode, setMaintenanceMode] = useState(initialSettings['MAINTENANCE_MODE'] === 'true');

  const handleProfileSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser) return;
    setIsSubmitting(true);
    try {
      await updateProfileSettingsAction(currentUser.id, profileName, profileEmail);
      alert('Profile updated successfully!');
    } catch (err) {
      alert('Failed to update profile.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSystemSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      await updateSystemSettingsAction(currentUser?.id || 1, [
        { key: 'HOSPITAL_NAME', value: systemName },
        { key: 'HOSPITAL_EMAIL', value: systemEmail },
        { key: 'MAX_DAILY_APPOINTMENTS', value: maxAppointments },
        { key: 'MAINTENANCE_MODE', value: maintenanceMode ? 'true' : 'false' },
      ]);
      alert('System configurations updated successfully!');
    } catch (err) {
      alert('Failed to update system settings.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="bg-white shadow-sm ring-1 ring-gray-200 rounded-xl overflow-hidden">
      <div className="border-b border-gray-200 overflow-x-auto">
        <nav className="-mb-px flex space-x-8 px-6 min-w-max" aria-label="Tabs">
          <button 
            onClick={() => setActiveTab('Profile')} 
            className={`whitespace-nowrap border-b-2 py-4 px-1 text-sm font-medium flex items-center ${activeTab === 'Profile' ? 'border-blue-500 text-blue-600' : 'border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700'}`}
          >
            <User className="h-4 w-4 mr-2"/> Profile
          </button>
          <button 
            onClick={() => setActiveTab('Security')} 
            className={`whitespace-nowrap border-b-2 py-4 px-1 text-sm font-medium flex items-center ${activeTab === 'Security' ? 'border-blue-500 text-blue-600' : 'border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700'}`}
          >
            <Shield className="h-4 w-4 mr-2"/> Security
          </button>
          <button 
            onClick={() => setActiveTab('Notifications')} 
            className={`whitespace-nowrap border-b-2 py-4 px-1 text-sm font-medium flex items-center ${activeTab === 'Notifications' ? 'border-blue-500 text-blue-600' : 'border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700'}`}
          >
            <Bell className="h-4 w-4 mr-2"/> Notifications
          </button>
          {canManageSystem && <button 
            onClick={() => setActiveTab('System')} 
            className={`whitespace-nowrap border-b-2 py-4 px-1 text-sm font-medium flex items-center ${activeTab === 'System' ? 'border-blue-500 text-blue-600' : 'border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700'}`}
          >
            <SettingsIcon className="h-4 w-4 mr-2"/> System Configurations
          </button>}
        </nav>
      </div>

      <div className="p-6">
        {activeTab === 'Profile' && (
          <form onSubmit={handleProfileSubmit} className="space-y-8">
            <div>
              <h2 className="text-base font-semibold leading-7 text-gray-900">Personal Information</h2>
              <p className="mt-1 text-sm leading-6 text-gray-500">Update your personal details and how others see you on the system.</p>

              <div className="mt-6 grid grid-cols-1 gap-x-6 gap-y-8 sm:grid-cols-6">
                <div className="sm:col-span-4">
                  <label htmlFor="name" className="block text-sm font-medium leading-6 text-gray-900">Full name</label>
                  <div className="mt-2">
                    <input type="text" required id="name" value={profileName} onChange={e => setProfileName(e.target.value)} className="block w-full rounded-md border-0 py-1.5 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 focus:ring-2 focus:ring-inset focus:ring-blue-600 sm:text-sm sm:leading-6" />
                  </div>
                </div>

                <div className="sm:col-span-4">
                  <label htmlFor="email" className="block text-sm font-medium leading-6 text-gray-900">Email address</label>
                  <div className="mt-2">
                    <input id="email" required type="email" value={profileEmail} onChange={e => setProfileEmail(e.target.value)} className="block w-full rounded-md border-0 py-1.5 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 focus:ring-2 focus:ring-inset focus:ring-blue-600 sm:text-sm sm:leading-6" />
                  </div>
                </div>
                
                <div className="sm:col-span-4">
                  <label className="block text-sm font-medium leading-6 text-gray-900">Role</label>
                  <div className="mt-2">
                    <input disabled type="text" value={currentUser?.role || ''} className="block w-full rounded-md border-0 py-1.5 text-gray-500 bg-gray-50 shadow-sm ring-1 ring-inset ring-gray-300 sm:text-sm sm:leading-6 capitalize" />
                    <p className="mt-1 text-xs text-gray-500">Contact a Super Admin to change your system role.</p>
                  </div>
                </div>
              </div>
            </div>
            
            <div className="pt-6 border-t border-gray-200 flex justify-end">
               <button type="submit" disabled={isSubmitting} className="flex items-center rounded-md bg-blue-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-blue-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600 disabled:opacity-50">
                <Save className="w-4 h-4 mr-2" /> {isSubmitting ? 'Saving...' : 'Save Profile Changes'}
              </button>
            </div>
          </form>
        )}

        {activeTab === 'Security' && (
          <div className="space-y-6">
            <div>
              <h2 className="text-base font-semibold leading-7 text-gray-900">Password & Security</h2>
              <p className="mt-1 text-sm leading-6 text-gray-500">Manage your password and security preferences.</p>
            </div>
            <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
              <p className="text-sm text-gray-700 mb-4">To update your password, please use the secure password reset flow.</p>
              <Link href="/auth/reset-password" className="inline-flex items-center rounded-md bg-white px-3 py-2 text-sm font-semibold text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 hover:bg-gray-50">
                Go to Password Reset
              </Link>
            </div>
          </div>
        )}

        {activeTab === 'Notifications' && (
          <div className="space-y-8">
            <div>
              <h2 className="text-base font-semibold leading-7 text-gray-900">Notification Preferences</h2>
              <p className="mt-1 text-sm leading-6 text-gray-500">Choose what updates you want to receive.</p>
            </div>
            <div className="space-y-4">
              <label className="flex items-center gap-3 cursor-pointer">
                <input type="checkbox" defaultChecked className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-600" />
                <span className="text-sm text-gray-900 font-medium">New Patient Assignments</span>
              </label>
              <label className="flex items-center gap-3 cursor-pointer">
                <input type="checkbox" defaultChecked className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-600" />
                <span className="text-sm text-gray-900 font-medium">Lab & Diagnostic Results Ready</span>
              </label>
              <label className="flex items-center gap-3 cursor-pointer">
                <input type="checkbox" defaultChecked className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-600" />
                <span className="text-sm text-gray-900 font-medium">Emergency Triage Alerts (STAT)</span>
              </label>
              <label className="flex items-center gap-3 cursor-pointer">
                <input type="checkbox" className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-600" />
                <span className="text-sm text-gray-900 font-medium">System Maintenance Notifications</span>
              </label>
            </div>
            <div className="pt-6 border-t border-gray-200 flex justify-end">
               <button type="button" className="flex items-center rounded-md bg-blue-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-blue-500">
                <Save className="w-4 h-4 mr-2" /> Save Preferences
              </button>
            </div>
          </div>
        )}

        {activeTab === 'System' && canManageSystem && (
          <form onSubmit={handleSystemSubmit} className="space-y-8">
            <div>
              <h2 className="text-base font-semibold leading-7 text-gray-900">Global System Configurations</h2>
              <p className="mt-1 text-sm leading-6 text-gray-500">Manage hospital-wide settings. (Requires Admin privileges)</p>

              <div className="mt-6 grid grid-cols-1 gap-x-6 gap-y-6 sm:grid-cols-6">
                <div className="sm:col-span-4">
                  <label className="block text-sm font-medium leading-6 text-gray-900">Hospital/Clinic Name</label>
                  <div className="mt-2">
                    <input type="text" required value={systemName} onChange={e => setSystemName(e.target.value)} className="block w-full rounded-md border-0 py-1.5 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 focus:ring-2 focus:ring-inset focus:ring-blue-600 sm:text-sm sm:leading-6" />
                  </div>
                </div>

                <div className="sm:col-span-4">
                  <label className="block text-sm font-medium leading-6 text-gray-900">System Reply-To Email</label>
                  <div className="mt-2">
                    <input required type="email" value={systemEmail} onChange={e => setSystemEmail(e.target.value)} className="block w-full rounded-md border-0 py-1.5 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 focus:ring-2 focus:ring-inset focus:ring-blue-600 sm:text-sm sm:leading-6" />
                  </div>
                </div>
                
                <div className="sm:col-span-3">
                  <label className="block text-sm font-medium leading-6 text-gray-900">Max Daily Appointments (Per Doctor)</label>
                  <div className="mt-2">
                    <input required type="number" min="1" value={maxAppointments} onChange={e => setMaxAppointments(e.target.value)} className="block w-full rounded-md border-0 py-1.5 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 focus:ring-2 focus:ring-inset focus:ring-blue-600 sm:text-sm sm:leading-6" />
                  </div>
                </div>

                <div className="sm:col-span-6 mt-4">
                  <div className="flex items-start gap-3 bg-red-50 p-4 rounded-lg border border-red-100">
                    <div className="flex h-6 items-center">
                      <input id="maintenance" type="checkbox" checked={maintenanceMode} onChange={e => setMaintenanceMode(e.target.checked)} className="h-4 w-4 rounded border-gray-300 text-red-600 focus:ring-red-600" />
                    </div>
                    <div className="text-sm leading-6">
                      <label htmlFor="maintenance" className="font-bold text-red-900">Enable Maintenance Mode</label>
                      <p className="text-red-700">If enabled, non-admin users will be prevented from logging in. Use only during planned database migrations or critical updates.</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
            
            <div className="pt-6 border-t border-gray-200 flex justify-end">
               <button type="submit" disabled={isSubmitting} className="flex items-center rounded-md bg-gray-900 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-gray-700 disabled:opacity-50">
                <Save className="w-4 h-4 mr-2" /> {isSubmitting ? 'Applying...' : 'Apply System Configurations'}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
