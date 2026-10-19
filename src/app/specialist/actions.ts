'use server';

import { db } from '@/db';
import { medicalRecords } from '@/db/schema';
import { eq } from 'drizzle-orm';
import { requireUser } from '@/lib/auth';
import { revalidatePath } from 'next/cache';

export async function addSpecialistRecommendationAction(recordId: number, recommendation: string) {
  await requireUser(['super_admin', 'admin', 'specialist']);
  if (!Number.isSafeInteger(recordId) || recordId <= 0 || !recommendation.trim() || recommendation.length > 10000) throw new Error('Invalid recommendation.');
  // In a real system, you might have a dedicated `specialist_consults` table.
  // Here, we'll append the specialist's notes to the existing referral record's notes.
  
  const record = await db.query.medicalRecords.findFirst({
    where: eq(medicalRecords.id, recordId)
  });

  if (record) {
    const updatedNotes = record.notes 
      ? `${record.notes}\n\n--- SPECIALIST RECOMMENDATION ---\n${recommendation}`
      : `--- SPECIALIST RECOMMENDATION ---\n${recommendation}`;

    await db.update(medicalRecords).set({
      notes: updatedNotes
    }).where(eq(medicalRecords.id, recordId));
  }

  revalidatePath('/specialist');
  revalidatePath('/patients');
}
