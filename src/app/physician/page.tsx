import { db } from '@/db';
import { patients, appointments, labResults, imagingResults } from '@/db/schema';
import { desc, eq, and, isNotNull } from 'drizzle-orm';
import PhysicianClient from './PhysicianClient';

export const dynamic = 'force-dynamic';

export default async function PhysicianPage() {
  const allPatients = await db.query.patients.findMany({
    orderBy: [desc(patients.createdAt)],
  });

  const recentAppointments = await db.query.appointments.findMany({
    with: { patient: true },
    orderBy: [desc(appointments.appointmentDate)],
    limit: 20
  });

  const pendingLabResults = await db.query.labResults.findMany({
    where: and(eq(labResults.status, 'Completed'), isNotNull(labResults.result)),
    with: { patient: true },
    orderBy: [desc(labResults.dateCompleted)],
    limit: 15
  });

  const pendingImagingResults = await db.query.imagingResults.findMany({
    where: and(eq(imagingResults.status, 'Completed'), isNotNull(imagingResults.resultText)),
    with: { patient: true },
    orderBy: [desc(imagingResults.dateCompleted)],
    limit: 15
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold leading-6 text-gray-900">Physician Desk</h1>
        <p className="mt-2 text-sm text-gray-700">
          Manage patient records, review laboratory and imaging results, prescribe medications, and track treatment plans.
        </p>
      </div>

      <PhysicianClient 
        patients={allPatients} 
        appointments={recentAppointments}
        recentLabs={pendingLabResults}
        recentImaging={pendingImagingResults}
      />
    </div>
  );
}
