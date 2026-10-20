import { notFound, redirect } from 'next/navigation';
import { eq } from 'drizzle-orm';
import { db } from '@/db';
import { patients } from '@/db/schema';
import { currentUser } from '@/lib/auth';
import PatientEditForm from './PatientEditForm';

export const dynamic = 'force-dynamic';

export default async function EditPatientPage({ params }: { params: Promise<{ id: string }> }) {
  const actor = await currentUser();
  if (!actor || !['super_admin', 'admin'].includes(actor.role)) redirect('/unauthorized');
  const { id } = await params;
  const patientId = Number(id);
  if (!Number.isSafeInteger(patientId) || patientId <= 0) notFound();
  const patient = await db.query.patients.findFirst({ where: eq(patients.id, patientId) });
  if (!patient) notFound();
  return <PatientEditForm patient={{ ...patient, dob: String(patient.dob) }} />;
}
