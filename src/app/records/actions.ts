'use server';

import { db } from '@/db';
import { recordAudits } from '@/db/schema';
import { eq } from 'drizzle-orm';
import { revalidatePath } from 'next/cache';
import { requireUser } from '@/lib/auth';

export async function submitAuditAction(data: {
  recordType: string;
  recordId: number;
  patientId: number;
  officerId: number;
  status: string;
  flagReason?: string;
}) {
  const actor = await requireUser(['super_admin', 'admin', 'medical_records']);
  await db.insert(recordAudits).values({
    recordType: data.recordType,
    recordId: data.recordId,
    patientId: data.patientId,
    officerId: actor.id,
    status: data.status,
    flagReason: data.flagReason || null,
  });

  revalidatePath('/records');
}

export async function updateAuditStatusAction(auditId: number, status: string, flagReason?: string) {
  await requireUser(['super_admin', 'admin', 'medical_records']);
  if (!['Pending', 'Verified', 'Flagged'].includes(status)) throw new Error('Invalid audit status.');
  await db.update(recordAudits).set({
    status,
    flagReason: flagReason || null,
    auditedAt: new Date()
  }).where(eq(recordAudits.id, auditId));
  
  revalidatePath('/records');
}
