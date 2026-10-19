import { db } from '@/db';
import { medicalRecords } from '@/db/schema';
import { eq, desc } from 'drizzle-orm';
import SpecialistClient from './SpecialistClient';

export const dynamic = 'force-dynamic';

export default async function SpecialistPage() {
  // Fetch all medical records where a primary care doctor referred the patient out.
  // In a multi-hospital system, you'd filter by specialist department, but here we just grab all internal referrals.
  const referrals = await db.query.medicalRecords.findMany({
    where: eq(medicalRecords.decisionType, 'Refer Out'),
    with: {
      patient: true,
      doctor: true, // referring doctor
    },
    orderBy: [desc(medicalRecords.recordDate)],
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold leading-6 text-gray-900">Specialist Hub</h1>
        <p className="mt-2 text-sm text-gray-700">
          Review incoming referrals, dive into complex patient histories, and provide specialist recommendations.
        </p>
      </div>

      <SpecialistClient referrals={referrals} />
    </div>
  );
}
