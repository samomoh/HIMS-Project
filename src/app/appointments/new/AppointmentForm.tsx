'use client';

import { FormEvent, useState } from 'react';
import { createAppointmentAction } from '../actions';

type PatientOption = { id: number; firstName: string; lastName: string };
type ClinicianOption = { id: number; name: string; role: string };

export default function AppointmentForm({ patients, clinicians }: { patients: PatientOption[]; clinicians: ClinicianOption[] }) {
  const [patientId, setPatientId] = useState('');
  const [doctorId, setDoctorId] = useState('');
  const [date, setDate] = useState('');
  const [reason, setReason] = useState('');
  const [error, setError] = useState('');
  const [pending, setPending] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setError(''); setPending(true);
    try {
      const result = await createAppointmentAction({ patientId: Number(patientId), doctorId: Number(doctorId), appointmentDate: new Date(date).toISOString(), reason });
      if (result.success) window.location.assign('/appointments');
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Could not create appointment.');
    } finally { setPending(false); }
  }

  return <form onSubmit={submit} className="space-y-5 rounded-xl bg-white p-6 shadow-sm ring-1 ring-gray-200">
    {error && <p role="alert" className="rounded-md bg-red-50 p-3 text-sm text-red-700">{error}</p>}
    <div className="grid gap-5 sm:grid-cols-2">
      <label className="block text-sm font-medium text-slate-700">Patient
        <select required value={patientId} onChange={(event) => setPatientId(event.target.value)} className="mt-2 block w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm">
          <option value="">Select a patient</option>{patients.map((patient) => <option key={patient.id} value={patient.id}>{patient.lastName}, {patient.firstName} · #{patient.id}</option>)}
        </select>
      </label>
      <label className="block text-sm font-medium text-slate-700">Clinician
        <select required value={doctorId} onChange={(event) => setDoctorId(event.target.value)} className="mt-2 block w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm">
          <option value="">Select a clinician</option>{clinicians.map((clinician) => <option key={clinician.id} value={clinician.id}>{clinician.name} · {clinician.role}</option>)}
        </select>
      </label>
      <label className="block text-sm font-medium text-slate-700 sm:col-span-2">Date and time
        <input required type="datetime-local" value={date} onChange={(event) => setDate(event.target.value)} className="mt-2 block w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm" />
      </label>
      <label className="block text-sm font-medium text-slate-700 sm:col-span-2">Visit reason <span className="font-normal text-slate-400">(optional)</span>
        <textarea rows={3} maxLength={2000} value={reason} onChange={(event) => setReason(event.target.value)} className="mt-2 block w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm" />
      </label>
    </div>
    {patients.length === 0 && <p className="text-sm text-amber-700">Register a patient before scheduling an appointment.</p>}
    {clinicians.length === 0 && <p className="text-sm text-amber-700">Add a doctor or specialist to the staff directory first.</p>}
    <button disabled={pending || patients.length === 0 || clinicians.length === 0} className="rounded-md bg-[#087e83] px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-50">{pending ? 'Saving…' : 'Schedule appointment'}</button>
  </form>;
}
