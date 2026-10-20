'use server';

import { db } from '@/db';
import { medicalRecords, labResults, patients } from '@/db/schema';
import { revalidatePath } from 'next/cache';

import { prescriptions, imagingResults } from '@/db/schema';
import { requireUser } from '@/lib/auth';
import { eq, sql } from 'drizzle-orm';
import { logAuditTrail } from '@/lib/audit';

export async function deletePatientAction(patientId: number): Promise<{ success: boolean; message: string }> {
  const actor = await requireUser(['super_admin', 'admin']);
  if (!Number.isSafeInteger(patientId) || patientId <= 0) return { success: false, message: 'Patient record ID is invalid.' };
  const patient = await db.query.patients.findFirst({ where: eq(patients.id, patientId) });
  if (!patient) return { success: false, message: 'Patient record not found.' };
  const references = await db.execute<{ references: number }>(sql`SELECT
    (SELECT count(*) FROM appointments WHERE patient_id = ${patientId}) +
    (SELECT count(*) FROM medical_records WHERE patient_id = ${patientId}) +
    (SELECT count(*) FROM vitals WHERE patient_id = ${patientId}) +
    (SELECT count(*) FROM patient_triage WHERE patient_id = ${patientId}) +
    (SELECT count(*) FROM emergency_triage WHERE patient_id = ${patientId}) +
    (SELECT count(*) FROM lab_results WHERE patient_id = ${patientId}) +
    (SELECT count(*) FROM imaging_results WHERE patient_id = ${patientId}) +
    (SELECT count(*) FROM prescriptions WHERE patient_id = ${patientId}) +
    (SELECT count(*) FROM invoices WHERE patient_id = ${patientId}) +
    (SELECT count(*) FROM record_audits WHERE patient_id = ${patientId}) AS reference_count`);
  if (patient.userId || Number(references.rows[0]?.reference_count) > 0) {
    return { success: false, message: 'This patient has a linked account or clinical history and cannot be deleted.' };
  }
  await logAuditTrail(actor.id, 'Deleted Patient', 'Patients', `Deleted patient ${patient.firstName} ${patient.lastName} (ID ${patientId})`);
  await db.delete(patients).where(eq(patients.id, patientId));
  revalidatePath('/patients');
  return { success: true, message: 'Patient record deleted.' };
}

export async function submitClinicalReviewAction(data: {
  patientId: number;
  doctorId: number;
  consultation: string;
  physicalExamination: string;
  diagnosis: string;
  treatment: string;
  notes: string;
  diagnostics: string[];
  diagnosticPriority: string;
}) {
  const actor = await requireUser(['super_admin', 'admin', 'doctor']);
  if (!Number.isSafeInteger(data.patientId) || data.patientId <= 0 || !data.diagnosis.trim() || data.diagnosis.length > 10000 || !Array.isArray(data.diagnostics) || data.diagnostics.length > 40 || data.diagnostics.some((test) => typeof test !== 'string' || !test.trim() || test.length > 255) || !['Routine', 'Urgent', 'Emergency'].includes(data.diagnosticPriority)) throw new Error('Invalid clinical review.');
  // Insert medical record
  await db.transaction(async (tx) => {
  await tx.insert(medicalRecords).values({
    patientId: data.patientId,
    doctorId: actor.id,
    consultation: data.consultation,
    physicalExamination: data.physicalExamination,
    diagnosis: data.diagnosis,
    treatment: data.treatment,
    notes: data.notes,
  });

  // Insert diagnostics if any
  if (data.diagnostics && data.diagnostics.length > 0) {
    const labInserts: (typeof labResults.$inferInsert)[] = [];
    const imagingInserts: (typeof imagingResults.$inferInsert)[] = [];
    
    data.diagnostics.forEach(test => {
      const isImaging = /x-ray|scan|mri|ultrasound/i.test(test);
      if (isImaging) {
        imagingInserts.push({
          patientId: data.patientId,
          doctorId: actor.id,
          procedureName: test,
          status: 'Pending',
          priority: data.diagnosticPriority,
        });
      } else {
        labInserts.push({
          patientId: data.patientId,
          doctorId: actor.id,
          testName: test,
          status: 'Pending',
          priority: data.diagnosticPriority,
        });
      }
    });

    if (labInserts.length > 0) {
      await tx.insert(labResults).values(labInserts);
    }
    
    if (imagingInserts.length > 0) {
      await tx.insert(imagingResults).values(imagingInserts);
    }
  }
  });

  revalidatePath(`/patients/${data.patientId}`);
  revalidatePath('/laboratory');
  revalidatePath('/radiology');
}

export async function submitReviewResultsAction(data: {
  patientId: number;
  doctorId: number;
  diagnosis: string;
  decisionType: string;
  referralNote?: string;
  procedureNote?: string;
  wardAdmission?: string;
  medication?: string;
  dosage?: string;
  instructions?: string;
}) {
  const actor = await requireUser(['super_admin', 'admin', 'doctor', 'specialist']);
  if (!Number.isSafeInteger(data.patientId) || data.patientId <= 0 || !data.diagnosis.trim() || data.diagnosis.length > 10000) throw new Error('Invalid review results.');
  if (data.decisionType && !['Pharmacy', 'Internal Admission', 'Procedure/Surgery', 'Refer Out', 'Discharge'].includes(data.decisionType)) throw new Error('Invalid clinical decision.');
  await db.transaction(async (tx) => {
  await tx.insert(medicalRecords).values({
    patientId: data.patientId,
    doctorId: actor.id,
    diagnosis: data.diagnosis,
    decisionType: data.decisionType,
    referralNote: data.referralNote,
    procedureNote: data.procedureNote,
    wardAdmission: data.wardAdmission,
    notes: 'Clinical Review Results finalized.',
  });

  if (data.decisionType === 'Pharmacy' && data.medication && data.dosage) {
    await tx.insert(prescriptions).values({
      patientId: data.patientId,
      doctorId: actor.id,
      medication: data.medication,
      dosage: data.dosage,
      instructions: data.instructions,
    });
    revalidatePath('/pharmacy');
  }
  });

  revalidatePath(`/patients/${data.patientId}`);
}
