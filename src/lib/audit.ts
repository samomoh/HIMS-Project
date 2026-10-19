import { db } from '@/db';
import { systemAuditTrail } from '@/db/schema';

export async function logAuditTrail(
  userId: number | null,
  action: string,
  moduleName: string,
  details: string,
  ipAddress?: string
) {
  try {
    await db.insert(systemAuditTrail).values({
      userId: userId,
      action: action,
      module: moduleName,
      details: details,
      ipAddress: ipAddress || null,
    });
  } catch (err) {
    console.error('Failed to log audit trail:', err);
  }
}
