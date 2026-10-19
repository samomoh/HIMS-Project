import { db } from '@/db';
import { labResults } from '@/db/schema';
import { desc } from 'drizzle-orm';
import LaboratoryClient from './LaboratoryClient';

export const dynamic = 'force-dynamic';

export default async function LaboratoryPage() {
  const allLabResults = await db.query.labResults.findMany({
    with: {
      patient: true,
      doctor: true,
    },
    orderBy: [desc(labResults.dateRequested)],
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold leading-6 text-gray-900">Laboratory Services</h1>
        <p className="mt-2 text-sm text-gray-700">
          Manage patient lab requests, track test statuses, and upload clinical results.
        </p>
      </div>

      <LaboratoryClient initialLabResults={allLabResults} />
    </div>
  );
}
