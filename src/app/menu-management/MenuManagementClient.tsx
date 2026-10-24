'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Plus, Trash2, Save, Link2 } from 'lucide-react';
import { MENU_ICONS, MENU_ROLE_OPTIONS, MENU_TARGETS, type CustomMenuItem, type MenuIconName } from '@/lib/custom-navigation';
import type { Role } from '@/lib/session-token';
import { saveCustomMenuAction } from './actions';

const roleLabels: Record<Role, string> = {
  super_admin: 'Super admin', admin: 'Admin', doctor: 'Doctor', specialist: 'Specialist', nurse: 'Nurse', receptionist: 'Receptionist', pharmacist: 'Pharmacist', laboratory: 'Laboratory', radiology: 'Radiology', emergency: 'Emergency', medical_records: 'Medical records', health_authority: 'Health authority', ict_support: 'ICT support', hr: 'HR',
};

function createItem(): CustomMenuItem {
  return { id: crypto.randomUUID(), name: '', href: MENU_TARGETS[0].href, icon: 'LayoutDashboard', roles: ['super_admin', 'admin'] };
}

export default function MenuManagementClient({ initialItems }: { initialItems: CustomMenuItem[] }) {
  const router = useRouter();
  const [items, setItems] = useState(initialItems);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const update = (id: string, patch: Partial<CustomMenuItem>) => setItems((current) => current.map((item) => item.id === id ? { ...item, ...patch } : item));
  const changeTarget = (item: CustomMenuItem, href: string) => {
    const target = MENU_TARGETS.find((entry) => entry.href === href)!;
    update(item.id, { href, roles: item.roles.filter((role) => (target.roles as readonly Role[]).includes(role)) });
  };
  const toggleRole = (item: CustomMenuItem, role: Role, checked: boolean) => update(item.id, { roles: checked ? [...item.roles, role] : item.roles.filter((current) => current !== role) });
  const save = async () => {
    setBusy(true); setMessage('');
    try { await saveCustomMenuAction(items); setMessage('Menu links saved and published.'); router.refresh(); }
    catch (error) { setMessage(error instanceof Error ? error.message : 'Could not save menu links.'); }
    finally { setBusy(false); }
  };

  return <div className="mx-auto max-w-5xl space-y-6">
    <header className="rounded-2xl bg-gradient-to-r from-slate-950 via-slate-900 to-teal-900 p-7 text-white shadow-lg">
      <div className="flex items-center gap-3"><span className="rounded-xl bg-white/10 p-3"><Link2 size={22} /></span><div><p className="text-sm font-semibold uppercase tracking-[.18em] text-teal-200">Workspace configuration</p><h1 className="mt-1 text-2xl font-bold">Menu manager</h1></div></div>
      <p className="mt-4 max-w-2xl text-sm leading-6 text-slate-200">Create shortcuts to existing system modules, choose their labels and icons, and set which eligible roles see them. Access permissions on each module remain in force.</p>
    </header>
    <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3"><div><h2 className="text-lg font-semibold text-slate-900">Custom menu links</h2><p className="mt-1 text-sm text-slate-500">Up to 20 shortcuts. New workflow screens still need to be built before they can be linked here.</p></div><button disabled={items.length >= 20} onClick={() => setItems((current) => [...current, createItem()])} className="inline-flex items-center gap-2 rounded-lg border border-teal-200 bg-teal-50 px-3 py-2 text-sm font-semibold text-teal-800 hover:bg-teal-100 disabled:opacity-50"><Plus size={16} /> Add link</button></div>
      <div className="space-y-4">
        {items.length === 0 && <div className="rounded-xl border border-dashed border-slate-300 p-8 text-center text-sm text-slate-500">No custom links yet. Add a link to place a shortcut in the sidebar.</div>}
        {items.map((item) => {
          const target = MENU_TARGETS.find((entry) => entry.href === item.href)!;
          return <article key={item.id} className="rounded-xl border border-slate-200 bg-slate-50/70 p-4 sm:p-5">
            <div className="grid gap-4 sm:grid-cols-3">
              <label className="text-sm font-medium text-slate-700">Menu label<input value={item.name} maxLength={40} onChange={(event) => update(item.id, { name: event.target.value })} placeholder="e.g. Theatre schedule" className="mt-1.5 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:border-teal-500 focus:ring-2 focus:ring-teal-100" /></label>
              <label className="text-sm font-medium text-slate-700">Open module<select value={item.href} onChange={(event) => changeTarget(item, event.target.value)} className="mt-1.5 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:border-teal-500 focus:ring-2 focus:ring-teal-100">{MENU_TARGETS.map((entry) => <option key={entry.href} value={entry.href}>{entry.label} · {entry.href}</option>)}</select></label>
              <label className="text-sm font-medium text-slate-700">Icon<select value={item.icon} onChange={(event) => update(item.id, { icon: event.target.value as MenuIconName })} className="mt-1.5 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:border-teal-500 focus:ring-2 focus:ring-teal-100">{MENU_ICONS.map((icon) => <option key={icon} value={icon}>{icon}</option>)}</select></label>
            </div>
            <div className="mt-4"><p className="mb-2 text-sm font-medium text-slate-700">Visible to roles <span className="font-normal text-slate-500">(limited to roles already allowed into this module)</span></p><div className="flex flex-wrap gap-x-4 gap-y-2">{MENU_ROLE_OPTIONS.filter((role) => (target.roles as readonly Role[]).includes(role)).map((role) => <label key={role} className="inline-flex items-center gap-2 text-sm text-slate-600"><input type="checkbox" checked={item.roles.includes(role)} onChange={(event) => toggleRole(item, role, event.target.checked)} className="rounded border-slate-300 text-teal-600 focus:ring-teal-500" />{roleLabels[role]}</label>)}</div></div>
            <div className="mt-4 flex items-center justify-between border-t border-slate-200 pt-3"><span className="text-xs text-slate-500">Destination: {item.href}</span><button onClick={() => setItems((current) => current.filter((entry) => entry.id !== item.id))} className="inline-flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-sm font-medium text-rose-700 hover:bg-rose-50"><Trash2 size={15} /> Remove</button></div>
          </article>;
        })}
      </div>
      <div className="mt-6 flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 pt-5"><p role="status" className="text-sm text-slate-600">{message}</p><button disabled={busy} onClick={save} className="inline-flex items-center gap-2 rounded-lg bg-teal-700 px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-teal-800 disabled:opacity-60"><Save size={16} />{busy ? 'Saving…' : 'Save menu'}</button></div>
    </section>
  </div>;
}
