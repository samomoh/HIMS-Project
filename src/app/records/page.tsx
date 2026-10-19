import { db } from '@/db';
import { recordAudits, users } from '@/db/schema';
import { desc, eq } from 'drizzle-orm';
import RecordsClient from './RecordsClient';

export const dynamic = 'force-dynamic';

export default async function MedicalRecordsPage() {
  const allPatients = await db.query.patients.findMany({
    with: {
      medicalRecords: true,
      labResults: true,
      imagingResults: true,
      prescriptions: true,
      appointments: true,
    },
    orderBy: (patients, { desc }) => [desc(patients.createdAt)],
  });

  const allAudits = await db.query.recordAudits.findMany({
    orderBy: [desc(recordAudits.auditedAt)],
  });

  const officers = await db.query.users.findMany({
    where: eq(users.role, 'medical_records')
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold leading-6 text-gray-900">Health Information Management (HIM)</h1>
        <p className="mt-2 text-sm text-gray-700">
          Maintain electronic health records, ensure data accuracy, and manage compliance audits.
        </p>
      </div>

      <RecordsClient 
        patients={allPatients} 
        audits={allAudits}
        officers={officers}
      />
    </div>
  );
}
