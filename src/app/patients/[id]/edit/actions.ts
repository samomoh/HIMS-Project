'use server';

import { eq } from 'drizzle-orm';
import { revalidatePath } from 'next/cache';
import { db } from '@/db';
import { patients } from '@/db/schema';
import { logAuditTrail } from '@/lib/audit';
import { requireUser } from '@/lib/auth';
import { parsePatientInput } from '@/lib/patient-input';

export async function updatePatientAction(id: number, data: unknown): Promise<{ success: boolean; message: string }> {
  const actor = await requireUser(['super_admin', 'admin']);
  if (!Number.isSafeInteger(id) || id <= 0) return { success: false, message: 'Patient record ID is invalid.' };
  const patient = await db.query.patients.findFirst({ where: eq(patients.id, id) });
  if (!patient) return { success: false, message: 'Patient record not found.' };
  const input = parsePatientInput(data);
  if (!input) return { success: false, message: 'Check the patient details and try again.' };

  await db.update(patients).set(input).where(eq(patients.id, id));
  try {
    await logAuditTrail(actor.id, 'Updated Patient Demographics', 'Patients', `Updated demographic details for patient #${id}`);
  } catch (error) {
    console.error('Patient update audit logging failed:', error);
  }
  revalidatePath('/patients');
  revalidatePath(`/patients/${id}`);
  revalidatePath(`/patients/${id}/edit`);
  return { success: true, message: 'Patient details updated.' };
}
