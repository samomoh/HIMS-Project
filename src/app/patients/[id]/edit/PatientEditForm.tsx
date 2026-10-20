'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { updatePatientAction } from './actions';

type Patient = {
  id: number;
  firstName: string;
  lastName: string;
  dob: string;
  gender: string;
  contact: string;
  patientCategory: string;
  emergencyContact: string | null;
  address: string | null;
  bloodGroup: string | null;
};

const controlClass = 'mt-1 block w-full rounded-md border-0 bg-white py-2 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 focus:ring-2 focus:ring-inset focus:ring-blue-600 sm:text-sm';

export default function PatientEditForm({ patient }: { patient: Patient }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [message, setMessage] = useState('');
  const [form, setForm] = useState({
    firstName: patient.firstName,
    lastName: patient.lastName,
    dob: typeof patient.dob === 'string' ? patient.dob.slice(0, 10) : new Date(patient.dob).toISOString().slice(0, 10),
    gender: patient.gender,
    contact: patient.contact,
    patientCategory: patient.patientCategory,
    emergencyContact: patient.emergencyContact || '',
    address: patient.address || '',
    bloodGroup: patient.bloodGroup || '',
  });
  const update = (field: keyof typeof form, value: string) => setForm((current) => ({ ...current, [field]: value }));

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setMessage('');
    startTransition(async () => {
      const result = await updatePatientAction(patient.id, form);
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
        <Link href={`/patients/${patient.id}`} aria-label="Back to patient record" className="rounded-full p-2 text-gray-500 hover:bg-gray-100"><ArrowLeft className="h-5 w-5" /></Link>
        <div><h1 className="text-2xl font-bold text-gray-900">Edit patient details</h1><p className="mt-1 text-sm text-gray-600">Patient #{patient.id} · Changes are recorded in the audit trail.</p></div>
      </div>

      {message && <p role="alert" className="rounded-md bg-red-50 p-3 text-sm text-red-800">{message}</p>}

      <form onSubmit={handleSubmit} className="overflow-hidden rounded-xl bg-white shadow-sm ring-1 ring-gray-200">
        <div className="grid grid-cols-1 gap-5 p-6 sm:grid-cols-2">
          <div><label htmlFor="firstName" className="block text-sm font-medium text-gray-900">First name *</label><input id="firstName" required maxLength={255} value={form.firstName} onChange={(e) => update('firstName', e.target.value)} className={controlClass} /></div>
          <div><label htmlFor="lastName" className="block text-sm font-medium text-gray-900">Last name *</label><input id="lastName" required maxLength={255} value={form.lastName} onChange={(e) => update('lastName', e.target.value)} className={controlClass} /></div>
          <div><label htmlFor="dob" className="block text-sm font-medium text-gray-900">Date of birth *</label><input id="dob" required type="date" value={form.dob} onChange={(e) => update('dob', e.target.value)} className={controlClass} /></div>
          <div><label htmlFor="gender" className="block text-sm font-medium text-gray-900">Gender *</label><select id="gender" required value={form.gender} onChange={(e) => update('gender', e.target.value)} className={controlClass}><option>Male</option><option>Female</option><option>Other</option><option>Unknown</option></select></div>
          <div><label htmlFor="contact" className="block text-sm font-medium text-gray-900">Contact number *</label><input id="contact" required maxLength={50} value={form.contact} onChange={(e) => update('contact', e.target.value)} className={controlClass} /></div>
          <div><label htmlFor="emergencyContact" className="block text-sm font-medium text-gray-900">Emergency contact</label><input id="emergencyContact" maxLength={50} value={form.emergencyContact} onChange={(e) => update('emergencyContact', e.target.value)} className={controlClass} /></div>
          <div><label htmlFor="patientCategory" className="block text-sm font-medium text-gray-900">Intake category *</label><select id="patientCategory" required value={form.patientCategory} onChange={(e) => update('patientCategory', e.target.value)} className={controlClass}><option>Walked in</option><option>Emergency</option><option>Referred In</option></select></div>
          <div><label htmlFor="bloodGroup" className="block text-sm font-medium text-gray-900">Blood group</label><select id="bloodGroup" value={form.bloodGroup} onChange={(e) => update('bloodGroup', e.target.value)} className={controlClass}><option value="">Not recorded</option><option>A+</option><option>A-</option><option>B+</option><option>B-</option><option>O+</option><option>O-</option><option>AB+</option><option>AB-</option></select></div>
          <div className="sm:col-span-2"><label htmlFor="address" className="block text-sm font-medium text-gray-900">Address</label><textarea id="address" rows={3} maxLength={5000} value={form.address} onChange={(e) => update('address', e.target.value)} className={controlClass} /></div>
        </div>
        <div className="flex justify-end gap-3 border-t border-gray-200 bg-gray-50 px-6 py-4">
          <Link href={`/patients/${patient.id}`} className="rounded-md px-3 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-100">Cancel</Link>
          <button type="submit" disabled={isPending} className="rounded-md bg-blue-700 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-600 disabled:opacity-50">{isPending ? 'Saving…' : 'Save changes'}</button>
        </div>
      </form>
    </div>
  );
}
