'use server';

import { db } from '@/db';
import { labResults } from '@/db/schema';
import { eq } from 'drizzle-orm';
import { revalidatePath } from 'next/cache';
import { requireUser } from '@/lib/auth';
import { logAuditTrail } from '@/lib/audit';

export async function updateLabResultAction(id: number, resultText: string, validatedBy: string, fileUrl: string | null) {
  const actor = await requireUser(['super_admin', 'admin', 'doctor', 'specialist', 'laboratory', 'emergency']);
  if (!Number.isSafeInteger(id) || id <= 0 || !resultText.trim() || resultText.length > 20000) throw new Error('Invalid laboratory result.');
  await db.update(labResults).set({
    result: resultText,
    status: 'Completed',
    dateCompleted: new Date(),
    validatedBy: actor.name,
    reportUrl: fileUrl?.startsWith('https://') ? fileUrl.slice(0, 255) : null,
  }).where(eq(labResults.id, id));
  await logAuditTrail(actor.id, 'Updated Lab Result', 'Laboratory', `Completed laboratory result #${id}`);
  
  revalidatePath('/laboratory');
  revalidatePath('/patients'); // To refresh the EMR view
}
