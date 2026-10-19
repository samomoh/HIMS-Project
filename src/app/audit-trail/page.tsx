import { db } from '@/db';
import { systemAuditTrail } from '@/db/schema';
import { desc } from 'drizzle-orm';
import AuditClient from './AuditClient';

export const dynamic = 'force-dynamic';

export default async function AuditTrailPage() {
  const allLogs = await db.query.systemAuditTrail.findMany({
    with: {
      user: true,
    },
    orderBy: [desc(systemAuditTrail.timestamp)],
    limit: 500, // Fetch recent 500 logs for the viewer
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold leading-6 text-gray-900">System Audit Trail</h1>
        <p className="mt-2 text-sm text-gray-700">
          Chronological record of system activities, access, and operational changes.
        </p>
      </div>

      <AuditClient logs={allLogs} />
    </div>
  );
}
