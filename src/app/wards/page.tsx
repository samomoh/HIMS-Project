import { db } from '@/db';
import { emergencyTriage, imagingResults, labResults, medicationAdministrations, patients, prescriptions, users, vitals, wardAdmissions, wardBeds, wardCareEntries, wards } from '@/db/schema';
import { and, asc, desc, eq, inArray, isNull, isNotNull } from 'drizzle-orm';
import { currentUser } from '@/lib/auth';
import WardsClient from './WardsClient';

export const dynamic = 'force-dynamic';

export default async function WardsPage() {
  const actor = await currentUser();
  if (!actor) return null;
  const asOf = new Date();
  const selectAdmissionRows = () => db.select({
    id: wardAdmissions.id, admissionNumber: wardAdmissions.admissionNumber, patientId: patients.id,
    patientName: patients.firstName, patientLastName: patients.lastName, dob: patients.dob,
    source: wardAdmissions.source, sourceDetails: wardAdmissions.sourceDetails,
    diagnosis: wardAdmissions.diagnosis, attendingDoctorId: wardAdmissions.attendingDoctorId,
    attendingDoctorName: users.name, wardId: wards.id, wardName: wards.name,
    bedId: wardBeds.id, bedNumber: wardBeds.bedNumber, status: wardAdmissions.status,
    admittedAt: wardAdmissions.admittedAt, dischargedAt: wardAdmissions.dischargedAt,
      dischargeSummary: wardAdmissions.dischargeSummary, finalInvoiceId: wardAdmissions.finalInvoiceId,
  }).from(wardAdmissions)
    .innerJoin(patients, eq(patients.id, wardAdmissions.patientId))
    .innerJoin(wards, eq(wards.id, wardAdmissions.wardId))
    .leftJoin(wardBeds, eq(wardBeds.id, wardAdmissions.bedId))
    .leftJoin(users, eq(users.id, wardAdmissions.attendingDoctorId));

  const [bedList, clinicianList, patientList, activeAdmissions, pendingDischarges, recentFinalizedDischarges, erAwaitingAdmission] = await Promise.all([
    db.select({ wardId: wards.id, wardName: wards.name, specialty: wards.specialty, location: wards.location, bedId: wardBeds.id, bedNumber: wardBeds.bedNumber, bedStatus: wardBeds.status })
      .from(wards).leftJoin(wardBeds, eq(wardBeds.wardId, wards.id)).where(eq(wards.active, true)).orderBy(asc(wards.name), asc(wardBeds.bedNumber)),
    db.select({ id: users.id, name: users.name, role: users.role }).from(users).where(inArray(users.role, ['doctor', 'specialist'])).orderBy(asc(users.name)),
    db.select({ id: patients.id, firstName: patients.firstName, lastName: patients.lastName, dob: patients.dob, gender: patients.gender, contact: patients.contact })
      .from(patients).orderBy(desc(patients.createdAt)).limit(1000),
    selectAdmissionRows().where(eq(wardAdmissions.status, 'Admitted')).orderBy(desc(wardAdmissions.admittedAt)),
    selectAdmissionRows().where(and(eq(wardAdmissions.status, 'Discharged'), isNull(wardAdmissions.finalInvoiceId))).orderBy(desc(wardAdmissions.dischargedAt)),
    selectAdmissionRows().where(and(eq(wardAdmissions.status, 'Discharged'), isNotNull(wardAdmissions.finalInvoiceId))).orderBy(desc(wardAdmissions.dischargedAt)).limit(15),
    db.select({ id: emergencyTriage.id, patientId: patients.id, firstName: patients.firstName, lastName: patients.lastName, triageLevel: emergencyTriage.triageLevel, chiefComplaint: emergencyTriage.chiefComplaint, arrivalTime: emergencyTriage.arrivalTime })
      .from(emergencyTriage).innerJoin(patients, eq(patients.id, emergencyTriage.patientId)).where(eq(emergencyTriage.status, 'Active')).orderBy(asc(emergencyTriage.arrivalTime)).limit(200),
  ]);
  const dateValue = (value: Date | null) => value ? value.getTime() : 0;
  const recentDischarges = [...pendingDischarges, ...recentFinalizedDischarges].sort((a, b) => dateValue(b.dischargedAt) - dateValue(a.dischargedAt));
  const admissionList = [...activeAdmissions, ...recentDischarges];
  const activeAdmissionIds = activeAdmissions.map((admission) => admission.id);
  const activePatientIds = [...new Set(activeAdmissions.map((admission) => admission.patientId))];
  const [careEntries, patientVitals, patientLabs, patientImaging, patientPrescriptions, administrations, transferHistory] = activeAdmissionIds.length ? await Promise.all([
    db.select({ id: wardCareEntries.id, admissionId: wardCareEntries.admissionId, authorName: users.name, entryType: wardCareEntries.entryType, note: wardCareEntries.note, createdAt: wardCareEntries.createdAt })
      .from(wardCareEntries).leftJoin(users, eq(users.id, wardCareEntries.authorId)).where(inArray(wardCareEntries.admissionId, activeAdmissionIds)).orderBy(desc(wardCareEntries.createdAt)).limit(500),
    db.select({ id: vitals.id, patientId: vitals.patientId, bloodPressure: vitals.bloodPressure, heartRate: vitals.heartRate, temperature: vitals.temperature, respiratoryRate: vitals.respiratoryRate, oxygenSaturation: vitals.oxygenSaturation, weight: vitals.weight, height: vitals.height, recordedAt: vitals.recordedAt, nurseName: users.name })
      .from(vitals).leftJoin(users, eq(users.id, vitals.nurseId)).where(inArray(vitals.patientId, activePatientIds)).orderBy(desc(vitals.recordedAt)).limit(400),
    db.select({ id: labResults.id, patientId: labResults.patientId, testName: labResults.testName, status: labResults.status, result: labResults.result, requestedAt: labResults.dateRequested })
      .from(labResults).where(inArray(labResults.patientId, activePatientIds)).orderBy(desc(labResults.dateRequested)).limit(300),
    db.select({ id: imagingResults.id, patientId: imagingResults.patientId, procedureName: imagingResults.procedureName, status: imagingResults.status, scheduledDate: imagingResults.scheduledDate, requestedAt: imagingResults.dateRequested })
      .from(imagingResults).where(inArray(imagingResults.patientId, activePatientIds)).orderBy(desc(imagingResults.dateRequested)).limit(200),
    db.select({ id: prescriptions.id, patientId: prescriptions.patientId, medication: prescriptions.medication, dosage: prescriptions.dosage, instructions: prescriptions.instructions, status: prescriptions.status, prescribedDate: prescriptions.prescribedDate })
      .from(prescriptions).where(inArray(prescriptions.patientId, activePatientIds)).orderBy(desc(prescriptions.prescribedDate)).limit(300),
    db.select({ id: medicationAdministrations.id, patientId: prescriptions.patientId, prescriptionId: prescriptions.id, medication: prescriptions.medication, nurseName: users.name, administeredAt: medicationAdministrations.administeredAt, notes: medicationAdministrations.notes })
      .from(medicationAdministrations).innerJoin(prescriptions, eq(prescriptions.id, medicationAdministrations.prescriptionId)).leftJoin(users, eq(users.id, medicationAdministrations.nurseId)).where(inArray(prescriptions.patientId, activePatientIds)).orderBy(desc(medicationAdministrations.administeredAt)).limit(300),
    db.select({ id: wardCareEntries.id, admissionId: wardCareEntries.admissionId, entryType: wardCareEntries.entryType, note: wardCareEntries.note, createdAt: wardCareEntries.createdAt })
      .from(wardCareEntries).where(and(inArray(wardCareEntries.admissionId, activeAdmissionIds), eq(wardCareEntries.entryType, 'Transfer History'))).orderBy(desc(wardCareEntries.createdAt)).limit(300),
  ]) : [[], [], [], [], [], [], []];

  return <WardsClient
    actorRole={actor.role}
    asOf={asOf}
    wards={bedList}
    clinicians={clinicianList}
    patients={patientList}
    admissions={admissionList}
    careEntries={careEntries}
    vitals={patientVitals}
    labs={patientLabs}
    imaging={patientImaging}
    prescriptions={patientPrescriptions}
    administrations={administrations}
    transfers={transferHistory}
    erAwaitingAdmission={erAwaitingAdmission}
  />;
}
