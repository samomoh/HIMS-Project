import { db } from '@/db';
import { emergencyTriage, patients, users } from '@/db/schema';
import { desc, eq, inArray } from 'drizzle-orm';
import EmergencyClient from './EmergencyClient';

export const dynamic = 'force-dynamic';

export default async function EmergencyPage() {
  const allTriage = await db.query.emergencyTriage.findMany({
    with: {
      patient: true,
      staff: true,
    },
    orderBy: [desc(emergencyTriage.arrivalTime)],
  });

  const registeredPatients = await db.query.patients.findMany({
    orderBy: [desc(patients.createdAt)],
  });

  // Broaden the operator pool so the form is never left without a valid default —
  // admins and super-admins are acceptable as a fallback when no clinical staff is on shift.
  const erStaff = await db.query.users.findMany({
    where: inArray(users.role, ['emergency', 'doctor', 'nurse', 'super_admin', 'admin']),
    orderBy: [desc(users.createdAt)],
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold leading-6 text-gray-900">Emergency & Trauma Unit</h1>
        <p className="mt-2 text-sm text-gray-700">
          Manage acute cases, perform rapid triage, and automate STAT diagnostic orders.
        </p>
      </div>

      <EmergencyClient 
        initialTriage={allTriage} 
        patients={registeredPatients} 
        staffList={erStaff} 
      />
    </div>
  );
}
