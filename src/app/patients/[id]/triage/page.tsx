import Link from 'next/link';
import { notFound } from 'next/navigation';
import { db } from '@/db';
import { patients } from '@/db/schema';
import { currentUser } from '@/lib/auth';
import TriageForm from './TriageForm';

export const dynamic = 'force-dynamic';

const clinicalRoles = ['super_admin', 'admin', 'doctor', 'specialist', 'nurse', 'emergency'];

export default async function PatientTriagePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const patientId = Number(id);
  if (!Number.isSafeInteger(patientId) || patientId <= 0) notFound();

  const [patient, actor] = await Promise.all([
    db.query.patients.findFirst({ where: (table, { eq }) => eq(table.id, patientId) }),
    currentUser(),
  ]);
  if (!patient) notFound();

  if (!actor || !clinicalRoles.includes(actor.role)) {
    return (
      <div className="mx-auto max-w-2xl rounded-xl bg-white p-8 text-center shadow-sm ring-1 ring-gray-200">
        <h1 className="text-xl font-semibold text-gray-900">Triage is awaiting clinical staff</h1>
        <p className="mt-2 text-sm text-gray-600">{patient.firstName} {patient.lastName} is registered. A nurse, doctor, or emergency clinician must record triage and vital signs.</p>
        <Link href={`/patients/${patient.id}`} className="mt-6 inline-flex rounded-md bg-blue-700 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-600">View patient record</Link>
      </div>
    );
  }

  return <TriageForm patient={{ id: patient.id, firstName: patient.firstName, lastName: patient.lastName, patientCategory: patient.patientCategory }} />;
}
