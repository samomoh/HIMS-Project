'use server';

import { and, desc, eq } from 'drizzle-orm';
import { revalidatePath } from 'next/cache';
import { db } from '@/db';
import { emergencyTriage, patientTriage, patients, vitals } from '@/db/schema';
import { logAuditTrail } from '@/lib/audit';
import { requireUser } from '@/lib/auth';

const triageLevels = ['Resuscitation', 'Emergent', 'Urgent', 'Less Urgent', 'Non-Urgent'] as const;

export type PatientTriageInput = {
  patientId: number;
  triageLevel: string;
  chiefComplaint: string;
  painScore: number;
  bloodPressure: string;
  heartRate: number;
  temperature: number;
  respiratoryRate: number;
  oxygenSaturation: number;
  weight?: number | null;
  height?: number | null;
  notes: string;
};

export async function recordPatientTriageAction(data: PatientTriageInput): Promise<{ success: boolean; message: string }> {
  const actor = await requireUser(['super_admin', 'admin', 'doctor', 'specialist', 'nurse', 'emergency']);
  if (!data || typeof data !== 'object') return { success: false, message: 'Triage details are invalid.' };
  const optionalMeasurementIsValid = (value: number | null | undefined, max: number, min = 0) =>
    value == null || (Number.isFinite(value) && value >= min && value <= max);
  if (!Number.isSafeInteger(data.patientId) || data.patientId <= 0
    || !triageLevels.includes(data.triageLevel as typeof triageLevels[number])
    || typeof data.chiefComplaint !== 'string' || !data.chiefComplaint.trim() || data.chiefComplaint.length > 5000
    || !Number.isSafeInteger(data.painScore) || data.painScore < 0 || data.painScore > 10
    || typeof data.bloodPressure !== 'string' || !/^\d{2,3}\/\d{2,3}$/.test(data.bloodPressure.trim())
    || !Number.isSafeInteger(data.heartRate) || data.heartRate < 1 || data.heartRate > 350
    || !Number.isFinite(data.temperature) || data.temperature < 25 || data.temperature > 45
    || !Number.isSafeInteger(data.respiratoryRate) || data.respiratoryRate < 1 || data.respiratoryRate > 100
    || !Number.isSafeInteger(data.oxygenSaturation) || data.oxygenSaturation < 0 || data.oxygenSaturation > 100
    || !optionalMeasurementIsValid(data.weight, 1000, 0.1)
    || !optionalMeasurementIsValid(data.height, 300, 1)
    || typeof data.notes !== 'string' || data.notes.length > 5000) {
    return { success: false, message: 'Check the triage details and vital sign values, then try again.' };
  }

  const patient = await db.query.patients.findFirst({ where: eq(patients.id, data.patientId) });
  if (!patient) return { success: false, message: 'Patient record not found. Refresh the page and try again.' };

  try {
    const triageId = await db.transaction(async (tx) => {
      const [vitalRecord] = await tx.insert(vitals).values({
        patientId: patient.id,
        nurseId: actor.id,
        bloodPressure: data.bloodPressure.trim(),
        heartRate: data.heartRate,
        temperature: data.temperature.toFixed(1),
        respiratoryRate: data.respiratoryRate,
        oxygenSaturation: data.oxygenSaturation,
        weight: data.weight == null ? null : data.weight.toFixed(2),
        height: data.height == null ? null : data.height.toFixed(2),
        notes: data.notes.trim() || null,
      }).returning({ id: vitals.id });
      if (!vitalRecord) throw new Error('Vital signs were not saved.');

      const [triageRecord] = await tx.insert(patientTriage).values({
        patientId: patient.id,
        staffId: actor.id,
        vitalsId: vitalRecord.id,
        triageLevel: data.triageLevel,
        chiefComplaint: data.chiefComplaint.trim(),
        painScore: data.painScore,
        notes: data.notes.trim() || null,
      }).returning({ id: patientTriage.id });
      if (!triageRecord) throw new Error('Triage record was not saved.');

      if (patient.patientCategory === 'Emergency') {
        const activeCase = await tx.query.emergencyTriage.findFirst({
          where: and(eq(emergencyTriage.patientId, patient.id), eq(emergencyTriage.status, 'Active')),
          orderBy: [desc(emergencyTriage.arrivalTime)],
        });
        if (activeCase) {
          await tx.update(emergencyTriage).set({
            staffId: actor.id,
            triageLevel: data.triageLevel,
            chiefComplaint: data.chiefComplaint.trim(),
          }).where(eq(emergencyTriage.id, activeCase.id));
        } else {
          await tx.insert(emergencyTriage).values({
            patientId: patient.id,
            staffId: actor.id,
            triageLevel: data.triageLevel,
            chiefComplaint: data.chiefComplaint.trim(),
            mechanismOfInjury: null,
          });
        }
      }
      return triageRecord.id;
    });

    try {
      await logAuditTrail(actor.id, 'Completed Patient Triage', 'Patients', `Triage #${triageId} recorded for patient #${patient.id} (${data.triageLevel})`);
    } catch (auditError) {
      console.error('Patient triage audit logging failed:', auditError);
    }
    revalidatePath('/patients');
    revalidatePath(`/patients/${patient.id}`);
    revalidatePath(`/patients/${patient.id}/triage`);
    if (patient.patientCategory === 'Emergency') revalidatePath('/emergency');
    revalidatePath('/nursing');
    return { success: true, message: 'Triage and vital signs saved.' };
  } catch (error) {
    console.error('Error recording patient triage:', error);
    return { success: false, message: 'Could not save triage. Please try again.' };
  }
}
