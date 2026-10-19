import { db } from '@/db';
import { imagingResults } from '@/db/schema';
import { desc } from 'drizzle-orm';
import RadiologyClient from './RadiologyClient';

export const dynamic = 'force-dynamic';

export default async function RadiologyPage() {
  const allImagingResults = await db.query.imagingResults.findMany({
    with: {
      patient: true,
      doctor: true,
    },
    orderBy: [desc(imagingResults.dateRequested)],
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold leading-6 text-gray-900">Radiology & Imaging</h1>
        <p className="mt-2 text-sm text-gray-700">
          Manage imaging procedures, schedule patients, and upload diagnostic reports.
        </p>
      </div>

      <RadiologyClient initialImagingResults={allImagingResults} />
    </div>
  );
}
