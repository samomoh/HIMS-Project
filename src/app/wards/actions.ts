'use server';

import { randomUUID } from 'node:crypto';
import { db } from '@/db';
import { emergencyTriage, invoices, medicationAdministrations, patients, prescriptions, users, vitals, wardAdmissions, wardBeds, wardCareEntries, wards, wardTransfers } from '@/db/schema';
import { and, eq, inArray } from 'drizzle-orm';
import { revalidatePath } from 'next/cache';
import { logAuditTrail } from '@/lib/audit';
import { requireUser } from '@/lib/auth';

const WARD_PATH = '/wards';
const SOURCE_OPTIONS = ['Surgery / Operating Theatre', 'Observation / Emergency Department', 'Outpatient or Other Department', 'Another Ward or Facility'];
const isId = (value: number) => Number.isSafeInteger(value) && value > 0;

async function safeAudit(userId: number, action: string, details: string) {
  try { await logAuditTrail(userId, action, 'Ward Management', details); }
  catch (error) { console.error('Ward audit logging failed:', error); }
}

export async function createWardAction(data: { name: string; specialty?: string; location?: string; bedCount: number }) {
  const actor = await requireUser(['super_admin', 'admin']);
  const name = data?.name?.trim();
  const specialty = data?.specialty?.trim() || null;
  const location = data?.location?.trim() || null;
  if (!name || name.length > 120 || (specialty && specialty.length > 120) || (location && location.length > 120)) throw new Error('Enter a valid ward name, specialty, and location.');
  if (!Number.isSafeInteger(data.bedCount) || data.bedCount < 1 || data.bedCount > 200) throw new Error('A ward must have between 1 and 200 beds.');
  const ward = await db.transaction(async (tx) => {
    const [created] = await tx.insert(wards).values({ name, specialty, location }).returning({ id: wards.id });
    await tx.insert(wardBeds).values(Array.from({ length: data.bedCount }, (_, index) => ({ wardId: created.id, bedNumber: `B-${String(index + 1).padStart(2, '0')}` })));
    return created;
  });
  await safeAudit(actor.id, 'Created Ward', `Created ward ${name} with ${data.bedCount} beds.`);
  revalidatePath(WARD_PATH);
  return { id: ward.id };
}

export async function addBedsAction(data: { wardId: number; bedCount: number }) {
  const actor = await requireUser(['super_admin', 'admin']);
  if (!isId(data.wardId) || !Number.isSafeInteger(data.bedCount) || data.bedCount < 1 || data.bedCount > 100) throw new Error('Add between 1 and 100 beds at a time.');
  const [ward] = await db.select({ id: wards.id, name: wards.name }).from(wards).where(and(eq(wards.id, data.wardId), eq(wards.active, true))).limit(1);
  if (!ward) throw new Error('Ward not found or inactive.');
  const existing = await db.select({ bedNumber: wardBeds.bedNumber }).from(wardBeds).where(eq(wardBeds.wardId, ward.id));
  const next = existing.reduce((max, bed) => Math.max(max, Number(bed.bedNumber.replace(/^B-/, '')) || 0), 0) + 1;
  if (next + data.bedCount - 1 > 999) throw new Error('Ward bed labels are limited to B-999.');
  await db.insert(wardBeds).values(Array.from({ length: data.bedCount }, (_, index) => ({ wardId: ward.id, bedNumber: `B-${String(next + index).padStart(2, '0')}` })));
  await safeAudit(actor.id, 'Added Ward Beds', `Added ${data.bedCount} beds to ward ${ward.name}.`);
  revalidatePath(WARD_PATH);
}

type AdmissionInput = {
  patientId: number; source: string; sourceDetails?: string; diagnosis: string;
  attendingDoctorId?: number; wardId: number; bedId?: number;
};

export async function createAdmissionAction(data: AdmissionInput) {
  const actor = await requireUser(['super_admin', 'admin', 'doctor', 'specialist', 'emergency', 'receptionist']);
  if (!data || !isId(data.patientId) || !isId(data.wardId) || (data.bedId != null && !isId(data.bedId))) throw new Error('Choose a patient, ward, and valid bed.');
  if (!SOURCE_OPTIONS.includes(data.source)) throw new Error('Choose a valid admission source.');
  const diagnosis = data.diagnosis?.trim();
  const sourceDetails = data.sourceDetails?.trim() || null;
  if (!diagnosis || diagnosis.length > 2000 || (sourceDetails && sourceDetails.length > 1000)) throw new Error('Enter a diagnosis and keep admission details within the allowed length.');
  if (data.source === 'Another Ward or Facility' && !sourceDetails) throw new Error('Enter the transferring ward or referring facility.');
  const attendingDoctorId = data.attendingDoctorId || (['doctor', 'specialist'].includes(actor.role) ? actor.id : null);
  if (attendingDoctorId && !isId(attendingDoctorId)) throw new Error('Choose a valid attending clinician.');

  const admissionNumber = `ADM-${new Date().toISOString().slice(0, 10).replaceAll('-', '')}-${randomUUID().slice(0, 8).toUpperCase()}`;
  let patientName = '';
  await db.transaction(async (tx) => {
    const [patient] = await tx.select({ id: patients.id, firstName: patients.firstName, lastName: patients.lastName }).from(patients).where(eq(patients.id, data.patientId)).limit(1);
    if (!patient) throw new Error('Patient record was not found.');
    patientName = `${patient.firstName} ${patient.lastName}`;
    const [active] = await tx.select({ id: wardAdmissions.id }).from(wardAdmissions).where(and(eq(wardAdmissions.patientId, data.patientId), eq(wardAdmissions.status, 'Admitted'))).limit(1);
    if (active) throw new Error('This patient already has an active ward admission.');
    if (!attendingDoctorId) throw new Error('Select the attending doctor or specialist responsible for this admission.');
    const [clinician] = await tx.select({ id: users.id, role: users.role }).from(users).where(eq(users.id, attendingDoctorId)).limit(1);
    if (!clinician || !['doctor', 'specialist'].includes(clinician.role)) throw new Error('Choose a valid attending doctor or specialist.');
    if (data.bedId) {
      const [bed] = await tx.select({ id: wardBeds.id, status: wardBeds.status }).from(wardBeds).where(and(eq(wardBeds.id, data.bedId), eq(wardBeds.wardId, data.wardId))).limit(1);
      if (!bed || bed.status !== 'Available') throw new Error('That bed is not available in the selected ward.');
    }
    const [admission] = await tx.insert(wardAdmissions).values({
      admissionNumber, patientId: data.patientId, source: data.source, sourceDetails,
      diagnosis, attendingDoctorId, wardId: data.wardId, bedId: data.bedId || null,
      admittedBy: actor.id,
    }).returning({ id: wardAdmissions.id });
    if (data.bedId) await tx.update(wardBeds).set({ status: 'Occupied' }).where(eq(wardBeds.id, data.bedId));
    if (data.source === 'Observation / Emergency Department') {
      await tx.update(emergencyTriage).set({ status: 'Admitted' }).where(and(eq(emergencyTriage.patientId, data.patientId), eq(emergencyTriage.status, 'Active')));
    }
    return admission;
  });
  await safeAudit(actor.id, 'Admitted Patient', `${patientName} entered ward care under admission ${admissionNumber} from ${data.source}.`);
  revalidatePath(WARD_PATH);
  revalidatePath('/patients');
  revalidatePath('/emergency');
  return { admissionNumber };
}

export async function addWardCareEntryAction(data: { admissionId: number; entryType: string; note: string }) {
  const actor = await requireUser(['super_admin', 'admin', 'doctor', 'specialist', 'nurse']);
  if (!isId(data.admissionId) || !['Nursing Care', 'Medical Review', 'Care Observation', 'Discharge Readiness'].includes(data.entryType)) throw new Error('Choose a valid care entry.');
  if ((data.entryType === 'Nursing Care' || data.entryType === 'Care Observation') && !['super_admin', 'admin', 'nurse'].includes(actor.role)) throw new Error('Only nursing staff can record nursing care and observations.');
  if (data.entryType === 'Medical Review' && !['super_admin', 'admin', 'doctor', 'specialist'].includes(actor.role)) throw new Error('Only clinicians can record a medical review.');
  if (data.entryType === 'Discharge Readiness' && !['super_admin', 'admin', 'doctor', 'specialist'].includes(actor.role)) throw new Error('Only a doctor or specialist can update discharge readiness.');
  const note = data.note?.trim();
  if (!note || note.length > 10_000) throw new Error('Enter a care note of up to 10,000 characters.');
  const [admission] = await db.select({ id: wardAdmissions.id, patientId: wardAdmissions.patientId, status: wardAdmissions.status }).from(wardAdmissions).where(eq(wardAdmissions.id, data.admissionId)).limit(1);
  if (!admission || admission.status !== 'Admitted') throw new Error('Care entries can only be added to an active admission.');
  await db.insert(wardCareEntries).values({ admissionId: admission.id, authorId: actor.id, entryType: data.entryType, note });
  await safeAudit(actor.id, `Recorded ${data.entryType}`, `Added a ${data.entryType.toLowerCase()} for inpatient admission ${admission.id}.`);
  revalidatePath(WARD_PATH);
  revalidatePath(`/patients/${admission.patientId}`);
}

export async function allocateAdmissionBedAction(data: { admissionId: number; bedId: number }) {
  const actor = await requireUser(['super_admin', 'admin', 'nurse']);
  if (!isId(data.admissionId) || !isId(data.bedId)) throw new Error('Choose an active admission and available bed.');
  await db.transaction(async (tx) => {
    const [admission] = await tx.select({ id: wardAdmissions.id, patientId: wardAdmissions.patientId, status: wardAdmissions.status, bedId: wardAdmissions.bedId }).from(wardAdmissions).where(eq(wardAdmissions.id, data.admissionId)).limit(1);
    if (!admission || admission.status !== 'Admitted' || admission.bedId) throw new Error('This admission already has a bed or is no longer active.');
    const [bed] = await tx.select({ id: wardBeds.id, wardId: wardBeds.wardId, bedNumber: wardBeds.bedNumber, status: wardBeds.status }).from(wardBeds).where(eq(wardBeds.id, data.bedId)).limit(1);
    if (!bed || bed.status !== 'Available') throw new Error('That bed is no longer available.');
    await tx.update(wardAdmissions).set({ wardId: bed.wardId, bedId: bed.id }).where(eq(wardAdmissions.id, admission.id));
    await tx.update(wardBeds).set({ status: 'Occupied' }).where(eq(wardBeds.id, bed.id));
    await tx.insert(wardCareEntries).values({ admissionId: admission.id, authorId: actor.id, entryType: 'Bed Allocation', note: `Allocated bed ${bed.bedNumber} in ward ${bed.wardId}.` });
  });
  await safeAudit(actor.id, 'Allocated Inpatient Bed', `Allocated bed ${data.bedId} to inpatient admission ${data.admissionId}.`);
  revalidatePath(WARD_PATH);
}

export async function administerWardMedicationAction(data: { admissionId: number; prescriptionId: number; notes: string }) {
  const actor = await requireUser(['super_admin', 'admin', 'nurse']);
  if (!isId(data.admissionId) || !isId(data.prescriptionId) || typeof data.notes !== 'string' || data.notes.length > 5000) throw new Error('Medication administration details are invalid.');
  const [admission] = await db.select({ patientId: wardAdmissions.patientId, status: wardAdmissions.status })
    .from(wardAdmissions).where(eq(wardAdmissions.id, data.admissionId)).limit(1);
  if (!admission || admission.status !== 'Admitted') throw new Error('Medication can only be recorded for an active admission.');
  const [prescription] = await db.select({ id: prescriptions.id, status: prescriptions.status, medication: prescriptions.medication })
    .from(prescriptions).where(and(eq(prescriptions.id, data.prescriptionId), eq(prescriptions.patientId, admission.patientId))).limit(1);
  if (!prescription || prescription.status !== 'Dispensed') throw new Error('Only a dispensed prescription for this patient can be administered.');
  await db.insert(medicationAdministrations).values({ prescriptionId: prescription.id, nurseId: actor.id, notes: data.notes.trim() || null });
  await safeAudit(actor.id, 'Administered Medication', `Recorded administration of prescription ${prescription.id} during ward admission.`);
  revalidatePath(WARD_PATH);
  revalidatePath('/nursing');
}

export async function recordWardVitalsAction(data: {
  admissionId: number; bloodPressure: string; heartRate: number | null; temperature: number | null;
  respiratoryRate: number | null; oxygenSaturation: number | null; weight: number | null; height: number | null; notes: string;
}) {
  const actor = await requireUser(['super_admin', 'admin', 'nurse']);
  if (!isId(data.admissionId)) throw new Error('Choose an active admission.');
  const [admission] = await db.select({ id: wardAdmissions.id, patientId: wardAdmissions.patientId, status: wardAdmissions.status }).from(wardAdmissions).where(eq(wardAdmissions.id, data.admissionId)).limit(1);
  if (!admission || admission.status !== 'Admitted') throw new Error('Vitals can only be recorded for an active admission.');
  const ranges: Array<[number | null, number, number]> = [[data.heartRate, 0, 350], [data.temperature, 20, 50], [data.respiratoryRate, 0, 100], [data.oxygenSaturation, 0, 100], [data.weight, 0, 1000], [data.height, 0, 300]];
  if (ranges.some(([value, min, max]) => value != null && (!Number.isFinite(value) || value < min || value > max)) || typeof data.bloodPressure !== 'string' || data.bloodPressure.length > 20 || typeof data.notes !== 'string' || data.notes.length > 5000) throw new Error('Vital signs contain invalid values.');
  if (![data.bloodPressure, ...ranges.map(([value]) => value)].some((value) => value != null && value !== '')) throw new Error('Enter at least one vital sign.');
  await db.insert(vitals).values({
    patientId: admission.patientId, nurseId: actor.id, bloodPressure: data.bloodPressure || null,
    heartRate: data.heartRate, temperature: data.temperature == null ? null : String(data.temperature),
    respiratoryRate: data.respiratoryRate, oxygenSaturation: data.oxygenSaturation,
    weight: data.weight == null ? null : String(data.weight), height: data.height == null ? null : String(data.height),
    notes: data.notes.trim() || null,
  });
  await safeAudit(actor.id, 'Recorded Ward Vitals', `Recorded observations for inpatient admission ${admission.id}.`);
  revalidatePath(WARD_PATH);
  revalidatePath(`/patients/${admission.patientId}`);
}

export async function transferAdmissionAction(data: { admissionId: number; wardId: number; bedId: number; reason: string }) {
  const actor = await requireUser(['super_admin', 'admin', 'doctor', 'specialist']);
  if (!isId(data.admissionId) || !isId(data.wardId) || !isId(data.bedId)) throw new Error('Choose a destination ward and bed.');
  const reason = data.reason?.trim();
  if (!reason || reason.length > 2000) throw new Error('Enter a transfer reason of up to 2,000 characters.');
  await db.transaction(async (tx) => {
    const [admission] = await tx.select({ id: wardAdmissions.id, patientId: wardAdmissions.patientId, wardId: wardAdmissions.wardId, bedId: wardAdmissions.bedId, status: wardAdmissions.status }).from(wardAdmissions).where(eq(wardAdmissions.id, data.admissionId)).limit(1);
    if (!admission || admission.status !== 'Admitted') throw new Error('Only active admissions can be transferred.');
    const [bed] = await tx.select({ id: wardBeds.id, wardId: wardBeds.wardId, status: wardBeds.status }).from(wardBeds).where(eq(wardBeds.id, data.bedId)).limit(1);
    if (!bed || bed.wardId !== data.wardId || bed.status !== 'Available') throw new Error('That destination bed is not available.');
    await tx.insert(wardTransfers).values({ admissionId: admission.id, fromWardId: admission.wardId, fromBedId: admission.bedId, toWardId: data.wardId, toBedId: data.bedId, reason, transferredBy: actor.id });
    await tx.insert(wardCareEntries).values({ admissionId: admission.id, authorId: actor.id, entryType: 'Transfer History', note: `Transferred to ward ${data.wardId}, bed ${data.bedId}. Reason: ${reason}` });
    await tx.update(wardAdmissions).set({ wardId: data.wardId, bedId: data.bedId }).where(eq(wardAdmissions.id, admission.id));
    if (admission.bedId) await tx.update(wardBeds).set({ status: 'Cleaning' }).where(eq(wardBeds.id, admission.bedId));
    await tx.update(wardBeds).set({ status: 'Occupied' }).where(eq(wardBeds.id, data.bedId));
  });
  await safeAudit(actor.id, 'Transferred Inpatient', `Transferred inpatient admission ${data.admissionId} to ward ${data.wardId}, bed ${data.bedId}.`);
  revalidatePath(WARD_PATH);
}

export async function dischargeAdmissionAction(data: { admissionId: number; summary: string }) {
  const actor = await requireUser(['super_admin', 'admin', 'doctor', 'specialist']);
  if (!isId(data.admissionId)) throw new Error('Choose a valid admission.');
  const summary = data.summary?.trim();
  if (!summary || summary.length > 10_000) throw new Error('Enter discharge instructions and summary.');
  let patientId = 0;
  let admissionNumber = '';
  await db.transaction(async (tx) => {
    const [admission] = await tx.select({ id: wardAdmissions.id, admissionNumber: wardAdmissions.admissionNumber, patientId: wardAdmissions.patientId, bedId: wardAdmissions.bedId, status: wardAdmissions.status }).from(wardAdmissions).where(eq(wardAdmissions.id, data.admissionId)).limit(1);
    if (!admission || admission.status !== 'Admitted') throw new Error('Only active admissions can be discharged.');
    patientId = admission.patientId;
    admissionNumber = admission.admissionNumber;
    const now = new Date();
    await tx.update(wardAdmissions).set({ status: 'Discharged', dischargedAt: now, dischargeSummary: summary }).where(eq(wardAdmissions.id, admission.id));
    if (admission.bedId) await tx.update(wardBeds).set({ status: 'Cleaning' }).where(eq(wardBeds.id, admission.bedId));
    await tx.update(emergencyTriage).set({ status: 'Discharged', dischargedTime: now }).where(and(eq(emergencyTriage.patientId, admission.patientId), eq(emergencyTriage.status, 'Admitted')));
  });
  await safeAudit(actor.id, 'Discharged Inpatient', `Clinically discharged admission ${admissionNumber}; final billing is pending.`);
  revalidatePath(WARD_PATH);
  revalidatePath('/emergency');
  revalidatePath(`/patients/${patientId}`);
}

export async function finalizeWardInvoiceAction(data: { admissionId: number; finalBill: number }) {
  const actor = await requireUser(['super_admin', 'admin', 'receptionist']);
  if (!isId(data.admissionId) || typeof data.finalBill !== 'number' || !Number.isFinite(data.finalBill) || data.finalBill < 0 || data.finalBill > 1_000_000_000) throw new Error('Enter a valid final bill amount.');
  let invoiceId = 0;
  let admissionNumber = '';
  await db.transaction(async (tx) => {
    const [admission] = await tx.select({ id: wardAdmissions.id, patientId: wardAdmissions.patientId, admissionNumber: wardAdmissions.admissionNumber, status: wardAdmissions.status, finalInvoiceId: wardAdmissions.finalInvoiceId }).from(wardAdmissions).where(eq(wardAdmissions.id, data.admissionId)).limit(1);
    if (!admission || admission.status !== 'Discharged') throw new Error('Final billing is available after clinical discharge.');
    if (admission.finalInvoiceId) throw new Error('A final invoice has already been recorded for this admission.');
    admissionNumber = admission.admissionNumber;
    const now = new Date();
    const [invoice] = await tx.insert(invoices).values({
      patientId: admission.patientId,
      amount: data.finalBill.toFixed(2),
      status: data.finalBill === 0 ? 'Paid' : 'Unpaid',
      description: `Inpatient discharge bill — ${admission.admissionNumber}${data.finalBill === 0 ? ' (no charge)' : ''}`,
      issuedBy: actor.id,
      dueDate: new Date(now.getTime() + 30 * 86_400_000),
      paidAt: data.finalBill === 0 ? now : null,
    }).returning({ id: invoices.id });
    invoiceId = invoice.id;
    await tx.update(wardAdmissions).set({ finalInvoiceId: invoice.id }).where(eq(wardAdmissions.id, admission.id));
  });
  await safeAudit(actor.id, 'Finalized Inpatient Bill', `Recorded invoice ${invoiceId} for discharged admission ${admissionNumber}.`);
  revalidatePath(WARD_PATH);
  revalidatePath('/billing');
}

export async function markBedAvailableAction(bedId: number) {
  const actor = await requireUser(['super_admin', 'admin', 'nurse']);
  if (!isId(bedId)) throw new Error('Choose a valid bed.');
  const [bed] = await db.update(wardBeds).set({ status: 'Available' }).where(and(eq(wardBeds.id, bedId), eq(wardBeds.status, 'Cleaning'))).returning({ id: wardBeds.id });
  if (!bed) throw new Error('Only a bed marked for cleaning can be released.');
  await safeAudit(actor.id, 'Released Ward Bed', `Marked bed ${bedId} as available after cleaning.`);
  revalidatePath(WARD_PATH);
}

export async function setBedStatusAction(data: { bedId: number; status: 'Available' | 'Reserved' | 'Out of service' }) {
  const actor = await requireUser(['super_admin', 'admin']);
  if (!isId(data?.bedId) || !['Available', 'Reserved', 'Out of service'].includes(data.status)) throw new Error('Choose a valid bed status.');
  const [bed] = await db.update(wardBeds).set({ status: data.status })
    .where(and(eq(wardBeds.id, data.bedId), inArray(wardBeds.status, ['Available', 'Reserved', 'Out of service'])))
    .returning({ id: wardBeds.id, bedNumber: wardBeds.bedNumber, wardId: wardBeds.wardId });
  if (!bed) throw new Error('Only available, reserved, or out-of-service beds can be changed. Occupied and cleaning beds are protected.');
  await safeAudit(actor.id, 'Changed Ward Bed Status', `Changed bed ${bed.bedNumber} in ward ${bed.wardId} to ${data.status}.`);
  revalidatePath(WARD_PATH);
}
