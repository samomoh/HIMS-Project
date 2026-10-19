'use server';

import { db } from '@/db';
import { imagingResults } from '@/db/schema';
import { eq } from 'drizzle-orm';
import { revalidatePath } from 'next/cache';
import { requireUser } from '@/lib/auth';
import { logAuditTrail } from '@/lib/audit';

export async function scheduleImagingAction(id: number, scheduledDate: Date) {
  const actor = await requireUser(['super_admin', 'admin', 'doctor', 'specialist', 'radiology', 'emergency']);
  if (!Number.isSafeInteger(id) || id <= 0 || Number.isNaN(new Date(scheduledDate).getTime())) throw new Error('Invalid imaging appointment.');
  await db.update(imagingResults).set({
    status: 'Scheduled',
    scheduledDate: scheduledDate,
  }).where(eq(imagingResults.id, id));
  await logAuditTrail(actor.id, 'Scheduled Imaging', 'Radiology', `Scheduled imaging result #${id}`);
  
  revalidatePath('/radiology');
  revalidatePath('/patients'); 
}

export async function updateImagingResultAction(id: number, resultText: string, validatedBy: string, fileUrl: string | null) {
  const actor = await requireUser(['super_admin', 'admin', 'doctor', 'specialist', 'radiology', 'emergency']);
  if (!Number.isSafeInteger(id) || id <= 0 || !resultText.trim() || resultText.length > 20000) throw new Error('Invalid imaging result.');
  await db.update(imagingResults).set({
    resultText: resultText,
    status: 'Completed',
    dateCompleted: new Date(),
    validatedBy: actor.name,
    reportUrl: fileUrl?.startsWith('https://') ? fileUrl.slice(0, 255) : null,
  }).where(eq(imagingResults.id, id));
  await logAuditTrail(actor.id, 'Updated Imaging Result', 'Radiology', `Completed imaging result #${id}`);
  
  revalidatePath('/radiology');
  revalidatePath('/patients'); 
}
