'use client';

import { useMemo, useState, useTransition } from 'react';
import { CalendarClock, RotateCw, Trash2, Users } from 'lucide-react';
import { createShiftScheduleAction, deleteShiftAction } from './actions';

type StaffOption = { id: number; name: string; role: string; department: string | null };
type ShiftRow = { id: number; staffId: number; name: string; role: string; department: string | null; shiftType: string; startsAt: Date | string; endsAt: Date | string; rotationId: string | null; notes: string | null };

const shiftStyles: Record<string, string> = {
  Morning: 'bg-amber-100 text-amber-800',
  Evening: 'bg-indigo-100 text-indigo-800',
  Night: 'bg-slate-200 text-slate-800',
};

function formatWhen(value: Date | string) {
  return new Date(value).toLocaleString([], { weekday: 'short', month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' });
}

export default function ShiftsClient({ staff, shifts, canManage }: { staff: StaffOption[]; shifts: ShiftRow[]; canManage: boolean }) {
  const [message, setMessage] = useState<{ text: string; error?: boolean } | null>(null);
  const [pending, startTransition] = useTransition();
  const [repeat, setRepeat] = useState('none');
  const onDuty = useMemo(() => {
    const now = Date.now();
    return shifts.filter((shift) => new Date(shift.startsAt).getTime() <= now && new Date(shift.endsAt).getTime() > now);
  }, [shifts]);

  const save = (formData: FormData) => {
    const staffId = Number(formData.get('staffId'));
    const repeatValue = String(formData.get('repeat')) as 'none' | 'daily' | 'weekly' | 'rotating';
    startTransition(async () => {
      try {
        const result = await createShiftScheduleAction({
          staffId,
          shiftType: String(formData.get('shiftType')) as 'Morning' | 'Evening' | 'Night',
          startDate: String(formData.get('startDate')),
          endDate: String(formData.get('endDate') || formData.get('startDate')),
          repeat: repeatValue,
          notes: String(formData.get('notes') || ''),
        });
        setMessage({ text: `${result.count} shift${result.count === 1 ? '' : 's'} added to the schedule.` });
        setRepeat('none');
        (document.getElementById('shift-form') as HTMLFormElement | null)?.reset();
      } catch (error) {
        setMessage({ text: error instanceof Error ? error.message : 'The schedule could not be saved.', error: true });
      }
    });
  };

  const remove = (id: number) => {
    if (!window.confirm('Remove this shift from the schedule?')) return;
    startTransition(async () => {
      try { await deleteShiftAction(id); setMessage({ text: 'Shift removed from the schedule.' }); }
      catch (error) { setMessage({ text: error instanceof Error ? error.message : 'The shift could not be removed.', error: true }); }
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <span className="rounded-xl bg-blue-100 p-3 text-blue-700"><CalendarClock className="h-6 w-6" /></span>
        <div><h1 className="text-2xl font-bold text-gray-900">Scheduling &amp; Shift Management</h1><p className="mt-1 text-sm text-gray-600">Assign shifts, plan rotations, and see who is working.</p></div>
      </div>

      {message && <div role="status" className={`rounded-lg px-4 py-3 text-sm ${message.error ? 'bg-red-50 text-red-800' : 'bg-green-50 text-green-800'}`}>{message.text}</div>}

      <section className="rounded-xl bg-white p-5 shadow-sm ring-1 ring-gray-200" aria-labelledby="on-duty-heading">
        <div className="mb-4 flex items-center justify-between"><div><h2 id="on-duty-heading" className="text-lg font-semibold text-gray-900">Working now</h2><p className="text-sm text-gray-500">Staff with an active shift at this moment.</p></div><span className="rounded-full bg-green-100 px-3 py-1 text-sm font-semibold text-green-800">{onDuty.length} on duty</span></div>
        {onDuty.length ? <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">{onDuty.map((shift) => <div key={shift.id} className="rounded-lg border border-green-200 bg-green-50 p-4"><div className="flex items-start justify-between gap-2"><strong className="text-gray-900">{shift.name}</strong><span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${shiftStyles[shift.shiftType] || 'bg-gray-100 text-gray-700'}`}>{shift.shiftType}</span></div><p className="mt-1 text-sm text-gray-600">{shift.role.replaceAll('_', ' ')}{shift.department ? ` · ${shift.department}` : ''}</p><p className="mt-2 text-xs text-gray-500">Until {formatWhen(shift.endsAt)}</p></div>)}</div> : <p className="rounded-lg bg-gray-50 px-4 py-6 text-center text-sm text-gray-600">No staff are scheduled on duty right now.</p>}
      </section>

      {canManage && <section className="rounded-xl bg-white p-5 shadow-sm ring-1 ring-gray-200" aria-labelledby="assign-heading">
        <div className="mb-4"><h2 id="assign-heading" className="text-lg font-semibold text-gray-900">Assign a shift</h2><p className="text-sm text-gray-500">Standard shifts are Morning 07:00–15:00, Evening 15:00–23:00, and Night 23:00–07:00.</p></div>
        {staff.length === 0 ? <p className="rounded-lg bg-amber-50 p-4 text-sm text-amber-800">Add staff records before assigning shifts.</p> : <form id="shift-form" action={save} className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <label className="text-sm font-medium text-gray-700">Staff member<select name="staffId" required defaultValue="" className="mt-1 block w-full rounded-md border-gray-300 text-sm"><option value="" disabled>Select staff</option>{staff.map((person) => <option key={person.id} value={person.id}>{person.name} · {person.role.replaceAll('_', ' ')}</option>)}</select></label>
          <label className="text-sm font-medium text-gray-700">{repeat === 'rotating' ? 'First shift in rotation' : 'Shift'}<select name="shiftType" className="mt-1 block w-full rounded-md border-gray-300 text-sm">{['Morning','Evening','Night'].map((name) => <option key={name}>{name}</option>)}</select></label>
          <label className="text-sm font-medium text-gray-700">Schedule pattern<select name="repeat" value={repeat} onChange={(event) => setRepeat(event.target.value)} className="mt-1 block w-full rounded-md border-gray-300 text-sm"><option value="none">One shift</option><option value="daily">Repeat daily</option><option value="weekly">Repeat weekly</option><option value="rotating">Rotate weekly (Morning → Evening → Night)</option></select></label>
          <label className="text-sm font-medium text-gray-700">Start date<input name="startDate" type="date" required defaultValue={new Date().toISOString().slice(0,10)} className="mt-1 block w-full rounded-md border-gray-300 text-sm" /></label>
          {repeat !== 'none' && <label className="text-sm font-medium text-gray-700">Repeat through<input name="endDate" type="date" required className="mt-1 block w-full rounded-md border-gray-300 text-sm" /><span className="mt-1 block text-xs font-normal text-gray-500">Up to 90 days. Weekly patterns use the same weekday.</span></label>}
          <label className="text-sm font-medium text-gray-700">Notes <span className="font-normal text-gray-400">(optional)</span><input name="notes" maxLength={500} placeholder="Ward or handover details" className="mt-1 block w-full rounded-md border-gray-300 text-sm" /></label>
          <div className="sm:col-span-2 lg:col-span-3"><button disabled={pending} className="inline-flex items-center gap-2 rounded-md bg-blue-700 px-4 py-2.5 text-sm font-semibold text-white hover:bg-blue-600 disabled:opacity-60">{repeat === 'rotating' ? <RotateCw className="h-4 w-4" /> : <CalendarClock className="h-4 w-4" />}{pending ? 'Saving…' : 'Add to schedule'}</button></div>
        </form>}
      </section>}

      <section className="overflow-hidden rounded-xl bg-white shadow-sm ring-1 ring-gray-200" aria-labelledby="schedule-heading">
        <div className="flex items-center gap-3 border-b border-gray-200 px-5 py-4"><Users className="h-5 w-5 text-gray-500" /><div><h2 id="schedule-heading" className="text-lg font-semibold text-gray-900">Staff schedule</h2><p className="text-sm text-gray-500">Past 7 days and upcoming 30 days.</p></div></div>
        {shifts.length === 0 ? <p className="p-8 text-center text-sm text-gray-500">No shifts scheduled for this period.</p> : <div className="overflow-x-auto"><table className="min-w-full divide-y divide-gray-200 text-sm"><thead className="bg-gray-50 text-left text-xs uppercase tracking-wide text-gray-500"><tr><th className="px-5 py-3">Staff member</th><th className="px-5 py-3">Shift</th><th className="px-5 py-3">Starts</th><th className="px-5 py-3">Ends</th><th className="px-5 py-3">Notes</th>{canManage && <th className="px-5 py-3">Actions</th>}</tr></thead><tbody className="divide-y divide-gray-100">{shifts.map((shift) => <tr key={shift.id} className="hover:bg-gray-50"><td className="whitespace-nowrap px-5 py-3"><span className="font-medium text-gray-900">{shift.name}</span><span className="block text-xs capitalize text-gray-500">{shift.role.replaceAll('_', ' ')}{shift.department ? ` · ${shift.department}` : ''}</span></td><td className="px-5 py-3"><span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${shiftStyles[shift.shiftType] || 'bg-gray-100 text-gray-700'}`}>{shift.shiftType}</span>{shift.rotationId && <span className="ml-1 text-xs text-blue-700" title="Part of a rotating schedule">↻ Rotation</span>}</td><td className="whitespace-nowrap px-5 py-3 text-gray-700">{formatWhen(shift.startsAt)}</td><td className="whitespace-nowrap px-5 py-3 text-gray-700">{formatWhen(shift.endsAt)}</td><td className="max-w-56 truncate px-5 py-3 text-gray-500">{shift.notes || '—'}</td>{canManage && <td className="px-5 py-3"><button type="button" disabled={pending} onClick={() => remove(shift.id)} className="inline-flex items-center gap-1 rounded px-2 py-1 text-red-700 hover:bg-red-50"><Trash2 className="h-4 w-4" />Remove</button></td>}</tr>)}</tbody></table></div>}
      </section>
    </div>
  );
}
