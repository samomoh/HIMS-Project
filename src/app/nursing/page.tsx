import { db } from '@/db';
import { patients, users, prescriptions } from '@/db/schema';
import { eq, desc, inArray } from 'drizzle-orm';
import NursingClient from './NursingClient';

export const dynamic = 'force-dynamic';

export default async function NursingPage() {
  const activePatients = await db.query.patients.findMany({
    with: {
      medicalRecords: {
        orderBy: (records, { desc }) => [desc(records.recordDate)],
        limit: 1,
      },
      vitals: {
        orderBy: (v, { desc }) => [desc(v.recordedAt)],
        limit: 1,
      }
    },
    orderBy: [desc(patients.createdAt)],
    limit: 20, // Example: Just fetch recent or currently admitted patients
  });

  const nurses = await db.query.users.findMany({
    where: eq(users.role, 'nurse')
  });

  const activePrescriptions = await db.query.prescriptions.findMany({
    where: eq(prescriptions.status, 'Dispensed'),
    with: {
      patient: true,
      administrations: {
        with: { nurse: true },
        orderBy: (admin, { desc }) => [desc(admin.administeredAt)]
      }
    },
    orderBy: [desc(prescriptions.dispensedDate)]
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold leading-6 text-gray-900">Nursing Station</h1>
        <p className="mt-2 text-sm text-gray-700">
          Record vital signs, update nursing notes, administer medications, and coordinate patient care.
        </p>
      </div>

      <NursingClient 
        patients={activePatients} 
        nurses={nurses} 
        prescriptions={activePrescriptions} 
      />
    </div>
  );
}
