import { db } from '@/db';
import { notFound } from 'next/navigation';
import { ArrowLeft, Stethoscope } from 'lucide-react';
import Link from 'next/link';
import ClinicalReviewForm from './ClinicalReviewForm';
import { users } from '@/db/schema';
import { eq } from 'drizzle-orm';

export const dynamic = 'force-dynamic';

export default async function ClinicalReviewPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params;
  const patientId = parseInt(id, 10);
  
  if (isNaN(patientId)) {
    notFound();
  }

  const patient = await db.query.patients.findFirst({
    where: (patients, { eq }) => eq(patients.id, patientId),
  });

  if (!patient) {
    notFound();
  }

  // Fetch doctors for the dropdown
  const doctors = await db.query.users.findMany({
    where: eq(users.role, 'doctor')
  });

  return (
    <div className="space-y-6 max-w-4xl">
      <div className="flex items-center gap-4">
        <Link href={`/patients/${patientId}`} className="p-2 rounded-full hover:bg-gray-200 text-gray-500">
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <div>
          <h1 className="text-2xl font-bold leading-6 text-gray-900 flex items-center gap-2">
            <Stethoscope className="text-blue-600" />
            Clinical Review: {patient.firstName} {patient.lastName}
          </h1>
          <p className="mt-1 text-sm text-gray-500">Conduct consultation, physical examination, and order diagnostics.</p>
        </div>
      </div>

      <ClinicalReviewForm patientId={patientId} doctors={doctors} />
    </div>
  );
}
