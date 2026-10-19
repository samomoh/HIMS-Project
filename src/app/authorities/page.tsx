import { db } from '@/db';
import { recordAudits, medicalRecords, patients, labResults } from '@/db/schema';
import { desc, sql } from 'drizzle-orm';
import AuthoritiesClient from './AuthoritiesClient';

export const dynamic = 'force-dynamic';

export default async function AuthoritiesPage() {
  // Aggregate public health stats (mock aggregations for demo)
  const [{ totalDiagnoses }] = await db.select({ totalDiagnoses: sql<number>`count(*)` }).from(medicalRecords);
  const [{ flaggedAudits }] = await db.select({ flaggedAudits: sql<number>`count(*)` }).from(recordAudits).where(sql`${recordAudits.status} = 'Flagged'`);
  const [{ totalPatients }] = await db.select({ totalPatients: sql<number>`count(*)` }).from(patients);

  // Patient Outcomes Aggregation
  const [{ admittedCount }] = await db.select({ admittedCount: sql<number>`count(*)` }).from(medicalRecords).where(sql`${medicalRecords.decisionType} = 'Internal Admission'`);
  const [{ referredCount }] = await db.select({ referredCount: sql<number>`count(*)` }).from(medicalRecords).where(sql`${medicalRecords.decisionType} = 'Refer Out'`);
  const [{ procedureCount }] = await db.select({ procedureCount: sql<number>`count(*)` }).from(medicalRecords).where(sql`${medicalRecords.decisionType} = 'Procedure/Surgery'`);
  const [{ pharmacyCount }] = await db.select({ pharmacyCount: sql<number>`count(*)` }).from(medicalRecords).where(sql`${medicalRecords.decisionType} = 'Pharmacy'`);

  // Fetch recent compliance audits
  const recentAudits = await db.query.recordAudits.findMany({
    with: {
      patient: true,
      officer: true,
    },
    orderBy: [desc(recordAudits.auditedAt)],
    limit: 50,
  });

  // Fetch recent lab tests to monitor public health trends (e.g. infectious diseases)
  const recentLabs = await db.query.labResults.findMany({
    where: (labs, { eq }) => eq(labs.status, 'Completed'),
    orderBy: [desc(labResults.dateCompleted)],
    limit: 50,
  });

  const stats = {
    totalDiagnoses: Number(totalDiagnoses || 0),
    flaggedAudits: Number(flaggedAudits || 0),
    totalPatients: Number(totalPatients || 0),
    outcomes: {
      admitted: Number(admittedCount || 0),
      referred: Number(referredCount || 0),
      procedure: Number(procedureCount || 0),
      pharmacy: Number(pharmacyCount || 0),
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold leading-6 text-gray-900">Health Authorities & Regulators</h1>
        <p className="mt-2 text-sm text-gray-700">
          Access compliance reports, monitor public health statistics, and oversee hospital audit logs.
        </p>
      </div>

      <AuthoritiesClient 
        stats={stats}
        audits={recentAudits}
        labs={recentLabs}
      />
    </div>
  );
}
