'use server';

import { db } from '@/db';
import { vitals, medicationAdministrations, prescriptions } from '@/db/schema';
import { eq } from 'drizzle-orm';
import { revalidatePath } from 'next/cache';
import { requireUser } from '@/lib/auth';
import { logAuditTrail } from '@/lib/audit';

export async function recordVitalsAction(data: {
  patientId: number;
  nurseId: number;
  bloodPressure: string;
  heartRate: number;
  temperature: number;
  respiratoryRate: number;
  oxygenSaturation: number;
  weight: number;
  height: number;
  notes: string;
}) {
  const actor = await requireUser(['super_admin', 'admin', 'nurse']);
  if (!Number.isSafeInteger(data.patientId) || data.patientId <= 0 || !Number.isSafeInteger(data.heartRate) || data.heartRate < 0 || data.heartRate > 350 || !Number.isFinite(data.temperature) || data.temperature < 20 || data.temperature > 50 || !Number.isSafeInteger(data.respiratoryRate) || data.respiratoryRate < 0 || data.respiratoryRate > 100 || !Number.isSafeInteger(data.oxygenSaturation) || data.oxygenSaturation < 0 || data.oxygenSaturation > 100 || !Number.isFinite(data.weight) || data.weight < 0 || data.weight > 1000 || !Number.isFinite(data.height) || data.height < 0 || data.height > 300 || data.bloodPressure.length > 20 || data.notes.length > 5000) throw new Error('Vital signs contain invalid values.');
  await db.insert(vitals).values({
    patientId: data.patientId,
    nurseId: actor.id,
    bloodPressure: data.bloodPressure,
    heartRate: data.heartRate,
    temperature: data.temperature.toString(),
    respiratoryRate: data.respiratoryRate,
    oxygenSaturation: data.oxygenSaturation,
    weight: data.weight.toString(),
    height: data.height.toString(),
    notes: data.notes,
  });
  await logAuditTrail(actor.id, 'Recorded Vitals', 'Nursing', `Recorded vitals for patient #${data.patientId}`);
  
  revalidatePath('/nursing');
  revalidatePath(`/patients/${data.patientId}`);
}

export async function administerMedicationAction(data: {
  prescriptionId: number;
  nurseId: number;
  notes: string;
}) {
  const actor = await requireUser(['super_admin', 'admin', 'nurse']);
  if (!Number.isSafeInteger(data.prescriptionId) || data.prescriptionId <= 0 || data.notes.length > 5000) throw new Error('Medication administration data is invalid.');
  const prescription = await db.query.prescriptions.findFirst({ where: eq(prescriptions.id, data.prescriptionId) });
  if (!prescription || prescription.status !== 'Dispensed') throw new Error('Only a dispensed prescription can be administered.');
  await db.insert(medicationAdministrations).values({
    prescriptionId: data.prescriptionId,
    nurseId: actor.id,
    notes: data.notes,
  });
  await logAuditTrail(actor.id, 'Administered Medication', 'Nursing', `Administered prescription #${data.prescriptionId}`);

  revalidatePath('/nursing');
}
