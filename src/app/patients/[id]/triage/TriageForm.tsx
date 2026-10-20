'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Activity, ArrowLeft, HeartPulse } from 'lucide-react';
import { recordPatientTriageAction } from './actions';

const fieldClass = 'mt-1 block w-full rounded-md border-0 bg-white py-2 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 focus:ring-2 focus:ring-inset focus:ring-blue-600 sm:text-sm';

export default function TriageForm({ patient }: { patient: { id: number; firstName: string; lastName: string; patientCategory: string } }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [message, setMessage] = useState('');
  const [form, setForm] = useState({
    triageLevel: '', chiefComplaint: '', painScore: '', bloodPressure: '', heartRate: '',
    temperature: '', respiratoryRate: '', oxygenSaturation: '', weight: '', height: '', notes: '',
  });
  const update = (key: keyof typeof form, value: string) => setForm((current) => ({ ...current, [key]: value }));

  const onSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setMessage('');
    startTransition(async () => {
      const result = await recordPatientTriageAction({
        patientId: patient.id,
        triageLevel: form.triageLevel,
        chiefComplaint: form.chiefComplaint,
        painScore: Number(form.painScore),
        bloodPressure: form.bloodPressure,
        heartRate: Number(form.heartRate),
        temperature: Number(form.temperature),
        respiratoryRate: Number(form.respiratoryRate),
        oxygenSaturation: Number(form.oxygenSaturation),
        weight: form.weight ? Number(form.weight) : null,
        height: form.height ? Number(form.height) : null,
        notes: form.notes,
      });
      if (!result.success) {
        setMessage(result.message);
        return;
      }
      router.push(`/patients/${patient.id}`);
      router.refresh();
    });
  };

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <div className="flex items-center gap-4">
        <Link href={`/patients/${patient.id}`} aria-label="Back to patient profile" className="rounded-full p-2 text-gray-500 hover:bg-gray-100"><ArrowLeft className="h-5 w-5" /></Link>
        <div>
          <p className="text-sm font-medium text-blue-700">Patient #{patient.id} · {patient.patientCategory}</p>
          <h1 className="text-2xl font-bold text-gray-900">Triage · {patient.firstName} {patient.lastName}</h1>
          <p className="mt-1 text-sm text-gray-600">Record the presenting concern, staff assessed priority, and initial observations.</p>
        </div>
      </div>

      <div className={`rounded-lg border p-4 text-sm ${patient.patientCategory === 'Emergency' ? 'border-red-200 bg-red-50 text-red-900' : 'border-amber-200 bg-amber-50 text-amber-900'}`} role="note">
        <strong>Clinical assessment required.</strong> Record observed values and select priority according to your facility&apos;s triage protocol. This form does not calculate acuity or provide clinical advice.
      </div>

      {message && <p role="alert" className="rounded-md bg-red-50 p-3 text-sm text-red-800">{message}</p>}

      <form onSubmit={onSubmit} className="overflow-hidden rounded-xl bg-white shadow-sm ring-1 ring-gray-200">
        <div className="space-y-8 p-6">
          <section className="space-y-4" aria-labelledby="triage-assessment-heading">
            <div className="flex items-center gap-2"><Activity className="h-5 w-5 text-blue-600" /><h2 id="triage-assessment-heading" className="text-lg font-semibold text-gray-900">Presenting concern and priority</h2></div>
            <div className="grid gap-5 sm:grid-cols-2">
              <div>
                <label htmlFor="triageLevel" className="block text-sm font-medium text-gray-900">Staff assessed priority <span className="text-red-600">*</span></label>
                <select id="triageLevel" required value={form.triageLevel} onChange={(e) => update('triageLevel', e.target.value)} className={fieldClass}>
                  <option value="" disabled>Select assessed priority</option><option>Resuscitation</option><option>Emergent</option><option>Urgent</option><option>Less Urgent</option><option>Non-Urgent</option>
                </select>
                <p className="mt-1 text-xs text-gray-500">Use your facility&apos;s approved triage protocol.</p>
              </div>
              <div>
                <label htmlFor="painScore" className="block text-sm font-medium text-gray-900">Pain score (0–10) <span className="text-red-600">*</span></label>
                <input id="painScore" type="number" min="0" max="10" step="1" required value={form.painScore} onChange={(e) => update('painScore', e.target.value)} className={fieldClass} />
              </div>
              <div className="sm:col-span-2">
                <label htmlFor="chiefComplaint" className="block text-sm font-medium text-gray-900">Presenting concern <span className="text-red-600">*</span></label>
                <textarea id="chiefComplaint" required maxLength={5000} rows={3} value={form.chiefComplaint} onChange={(e) => update('chiefComplaint', e.target.value)} className={fieldClass} placeholder="Record the patient's own words or observed reason for attendance." />
              </div>
            </div>
          </section>

          <section className="space-y-4 border-t border-gray-100 pt-6" aria-labelledby="vitals-heading">
            <div className="flex items-center gap-2"><HeartPulse className="h-5 w-5 text-rose-600" /><h2 id="vitals-heading" className="text-lg font-semibold text-gray-900">Initial vital signs</h2></div>
            <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
              <div><label htmlFor="bloodPressure" className="block text-sm font-medium text-gray-900">Blood pressure (mmHg) <span className="text-red-600">*</span></label><input id="bloodPressure" required pattern="\d{2,3}/\d{2,3}" title="Enter systolic/diastolic, for example 120/80" value={form.bloodPressure} onChange={(e) => update('bloodPressure', e.target.value)} className={fieldClass} placeholder="120/80" /></div>
              <div><label htmlFor="heartRate" className="block text-sm font-medium text-gray-900">Heart rate (bpm) <span className="text-red-600">*</span></label><input id="heartRate" required type="number" min="1" max="350" value={form.heartRate} onChange={(e) => update('heartRate', e.target.value)} className={fieldClass} placeholder="72" /></div>
              <div><label htmlFor="temperature" className="block text-sm font-medium text-gray-900">Temperature (°C) <span className="text-red-600">*</span></label><input id="temperature" required type="number" min="25" max="45" step="0.1" value={form.temperature} onChange={(e) => update('temperature', e.target.value)} className={fieldClass} placeholder="36.8" /></div>
              <div><label htmlFor="respiratoryRate" className="block text-sm font-medium text-gray-900">Respiratory rate (breaths/min) <span className="text-red-600">*</span></label><input id="respiratoryRate" required type="number" min="1" max="100" value={form.respiratoryRate} onChange={(e) => update('respiratoryRate', e.target.value)} className={fieldClass} placeholder="16" /></div>
              <div><label htmlFor="oxygenSaturation" className="block text-sm font-medium text-gray-900">Oxygen saturation (%) <span className="text-red-600">*</span></label><input id="oxygenSaturation" required type="number" min="0" max="100" value={form.oxygenSaturation} onChange={(e) => update('oxygenSaturation', e.target.value)} className={fieldClass} placeholder="98" /></div>
              <div><label htmlFor="weight" className="block text-sm font-medium text-gray-900">Weight (kg) <span className="text-gray-500">Optional</span></label><input id="weight" type="number" min="0.1" max="1000" step="0.01" value={form.weight} onChange={(e) => update('weight', e.target.value)} className={fieldClass} placeholder="—" /></div>
              <div><label htmlFor="height" className="block text-sm font-medium text-gray-900">Height (cm) <span className="text-gray-500">Optional</span></label><input id="height" type="number" min="1" max="300" step="0.1" value={form.height} onChange={(e) => update('height', e.target.value)} className={fieldClass} placeholder="—" /></div>
              <div className="sm:col-span-2 lg:col-span-3"><label htmlFor="notes" className="block text-sm font-medium text-gray-900">Additional observations <span className="text-gray-500">Optional</span></label><textarea id="notes" maxLength={5000} rows={3} value={form.notes} onChange={(e) => update('notes', e.target.value)} className={fieldClass} placeholder="Relevant observations or context." /></div>
            </div>
          </section>
        </div>
        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-gray-200 bg-gray-50 px-6 py-4">
          <Link href={`/patients/${patient.id}`} className="text-sm font-semibold text-gray-700 hover:text-gray-900">Save for later</Link>
          <button type="submit" disabled={isPending} className="inline-flex items-center rounded-md bg-blue-700 px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-blue-600 disabled:cursor-wait disabled:opacity-60">{isPending ? 'Saving triage…' : 'Complete triage'}</button>
        </div>
      </form>
    </div>
  );
}
