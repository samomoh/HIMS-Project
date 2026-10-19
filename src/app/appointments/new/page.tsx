import Link from 'next/link';
import { inArray } from 'drizzle-orm';
import { ArrowLeft } from 'lucide-react';
import { db } from '@/db';
import { patients, users } from '@/db/schema';
import AppointmentForm from './AppointmentForm';

export const dynamic = 'force-dynamic';

export default async function NewAppointmentPage() {
  const [patientRows, clinicianRows] = await Promise.all([
    db.query.patients.findMany({ columns: { id: true, firstName: true, lastName: true }, orderBy: (table, { asc }) => [asc(table.lastName)], limit: 500 }),
    db.query.users.findMany({ where: inArray(users.role, ['doctor', 'specialist']), columns: { id: true, name: true, role: true }, orderBy: (table, { asc }) => [asc(table.name)] }),
  ]);
  return <div className="mx-auto max-w-3xl space-y-6">
    <Link href="/appointments" className="inline-flex items-center gap-2 text-sm text-slate-500 hover:text-slate-800"><ArrowLeft size={16} /> Back to appointments</Link>
    <div><p className="mb-1 text-xs font-semibold uppercase tracking-[0.16em] text-[#087e83]">Scheduling</p><h1 className="text-2xl font-bold text-gray-900">New appointment</h1><p className="mt-2 text-sm text-slate-500">Choose a patient, clinician, and visit time.</p></div>
    <AppointmentForm patients={patientRows} clinicians={clinicianRows} />
  </div>;
}
