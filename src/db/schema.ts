import {
  pgTable,
  serial,
  varchar,
  text,
  timestamp,
  integer,
  boolean,
  decimal,
  date,
  index,
  uniqueIndex,
  customType,
} from 'drizzle-orm/pg-core';
import { relations, sql } from 'drizzle-orm';

const bytea = customType<{ data: Buffer; driverData: Buffer }>({ dataType: () => 'bytea' });

export const users = pgTable('users', {
  id: serial('id').primaryKey(),
  name: varchar('name', { length: 255 }).notNull(),
  email: varchar('email', { length: 255 }).notNull().unique(),
  passwordHash: varchar('password_hash', { length: 255 }), // Placeholder for auth integration
  sessionVersion: integer('session_version').notNull().default(0),
  resetToken: varchar('reset_token', { length: 255 }), 
  resetTokenExpiry: timestamp('reset_token_expiry'),
  role: varchar('role', { length: 50 }).notNull(), // super_admin, admin, hr, doctor, specialist, nurse, patient, receptionist, pharmacist, laboratory, radiology, emergency, medical_records, health_authority, ict_support
  department: varchar('department', { length: 100 }),
  contactNumber: varchar('contact_number', { length: 50 }),
  hireDate: date('hire_date'),
  licenseNumber: varchar('license_number', { length: 100 }),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

export const staffPhotos = pgTable('staff_photos', {
  userId: integer('user_id').primaryKey().references(() => users.id, { onDelete: 'cascade' }),
  photoData: bytea('photo_data').notNull(),
  photoMimeType: varchar('photo_mime_type', { length: 32 }).notNull(),
  uploadedAt: timestamp('uploaded_at').defaultNow().notNull(),
});

export const staffShifts = pgTable('staff_shifts', {
  id: serial('id').primaryKey(),
  staffId: integer('staff_id').references(() => users.id, { onDelete: 'cascade' }).notNull(),
  shiftType: varchar('shift_type', { length: 20 }).notNull(),
  startsAt: timestamp('starts_at').notNull(),
  endsAt: timestamp('ends_at').notNull(),
  rotationId: varchar('rotation_id', { length: 36 }),
  notes: text('notes'),
  createdBy: integer('created_by').references(() => users.id, { onDelete: 'set null' }),
  createdAt: timestamp('created_at').defaultNow().notNull(),
}, (table) => [
  index('staff_shifts_staff_start_idx').on(table.staffId, table.startsAt),
  index('staff_shifts_period_idx').on(table.startsAt, table.endsAt),
]);

export const recordAudits = pgTable('record_audits', {
  id: serial('id').primaryKey(),
  recordType: varchar('record_type', { length: 100 }).notNull(), // e.g. "MedicalRecord", "LabResult", "ImagingResult", "PatientDemographics"
  recordId: integer('record_id').notNull(),
  patientId: integer('patient_id').references(() => patients.id).notNull(),
  officerId: integer('officer_id').references(() => users.id).notNull(),
  status: varchar('status', { length: 50 }).notNull().default('Pending'), // Pending, Verified, Flagged
  flagReason: text('flag_reason'),
  auditedAt: timestamp('audited_at').defaultNow().notNull(),
});

export const systemAuditTrail = pgTable('system_audit_trail', {
  id: serial('id').primaryKey(),
  userId: integer('user_id').references(() => users.id),
  action: varchar('action', { length: 255 }).notNull(),
  module: varchar('module', { length: 100 }).notNull(),
  details: text('details'),
  ipAddress: varchar('ip_address', { length: 45 }),
  timestamp: timestamp('timestamp').defaultNow().notNull(),
});

export const systemSettings = pgTable('system_settings', {
  id: serial('id').primaryKey(),
  settingKey: varchar('setting_key', { length: 100 }).notNull().unique(),
  settingValue: text('setting_value'),
  description: text('description'),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

export const authRateLimits = pgTable('auth_rate_limits', {
  key: varchar('key', { length: 255 }).primaryKey(),
  attempts: integer('attempts').notNull().default(0),
  windowStarted: timestamp('window_started').notNull(),
  blockedUntil: timestamp('blocked_until'),
});

export const supportTickets = pgTable('support_tickets', {
  id: serial('id').primaryKey(),
  userId: integer('user_id').references(() => users.id).notNull(),
  subject: varchar('subject', { length: 255 }).notNull(),
  description: text('description').notNull(),
  status: varchar('status', { length: 50 }).notNull().default('Open'), // Open, In Progress, Resolved
  priority: varchar('priority', { length: 50 }).notNull().default('Low'), // Low, Medium, High, Critical
  createdAt: timestamp('created_at').defaultNow().notNull(),
  resolvedAt: timestamp('resolved_at'),
});

export const patients = pgTable('patients', {
  id: serial('id').primaryKey(),
  userId: integer('user_id').references(() => users.id),
  firstName: varchar('first_name', { length: 255 }).notNull(),
  lastName: varchar('last_name', { length: 255 }).notNull(),
  dob: date('dob').notNull(),
  gender: varchar('gender', { length: 20 }).notNull(),
  contact: varchar('contact', { length: 50 }).notNull(),
  patientCategory: varchar('patient_category', { length: 30 }).notNull().default('Walked in'),
  address: text('address'),
  bloodGroup: varchar('blood_group', { length: 10 }),
  emergencyContact: varchar('emergency_contact', { length: 50 }),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

export const appointments = pgTable('appointments', {
  id: serial('id').primaryKey(),
  patientId: integer('patient_id').references(() => patients.id).notNull(),
  doctorId: integer('doctor_id').references(() => users.id).notNull(),
  appointmentDate: timestamp('appointment_date').notNull(),
  status: varchar('status', { length: 50 }).notNull().default('Scheduled'), // Scheduled, Completed, Cancelled, In Progress
  reason: text('reason'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

export const medicalRecords = pgTable('medical_records', {
  id: serial('id').primaryKey(),
  patientId: integer('patient_id').references(() => patients.id).notNull(),
  doctorId: integer('doctor_id').references(() => users.id).notNull(),
  consultation: text('consultation'),
  physicalExamination: text('physical_examination'),
  diagnosis: text('diagnosis').notNull(),
  decisionType: varchar('decision_type', { length: 50 }), // Pharmacy, Admission, Procedure, Referral
  referralNote: text('referral_note'),
  procedureNote: text('procedure_note'),
  wardAdmission: text('ward_admission'),
  treatment: text('treatment'),
  notes: text('notes'),
  recordDate: timestamp('record_date').defaultNow().notNull(),
});

export const vitals = pgTable('vitals', {
  id: serial('id').primaryKey(),
  patientId: integer('patient_id').references(() => patients.id).notNull(),
  nurseId: integer('nurse_id').references(() => users.id).notNull(),
  bloodPressure: varchar('blood_pressure', { length: 20 }), // e.g. 120/80
  heartRate: integer('heart_rate'), // bpm
  temperature: decimal('temperature', { precision: 5, scale: 2 }), // Celsius
  respiratoryRate: integer('respiratory_rate'), // breaths per minute
  oxygenSaturation: integer('oxygen_saturation'), // percentage
  weight: decimal('weight', { precision: 6, scale: 2 }), // kg
  height: decimal('height', { precision: 6, scale: 2 }), // cm
  notes: text('notes'),
  recordedAt: timestamp('recorded_at').defaultNow().notNull(),
});

export const patientTriage = pgTable('patient_triage', {
  id: serial('id').primaryKey(),
  patientId: integer('patient_id').references(() => patients.id).notNull(),
  staffId: integer('staff_id').references(() => users.id).notNull(),
  vitalsId: integer('vitals_id').references(() => vitals.id).notNull(),
  triageLevel: varchar('triage_level', { length: 50 }).notNull(),
  chiefComplaint: text('chief_complaint').notNull(),
  painScore: integer('pain_score').notNull(),
  notes: text('notes'),
  recordedAt: timestamp('recorded_at').defaultNow().notNull(),
});

export const emergencyTriage = pgTable('emergency_triage', {
  id: serial('id').primaryKey(),
  patientId: integer('patient_id').references(() => patients.id), // Can be null if unidentified
  unidentifiedName: varchar('unidentified_name', { length: 255 }), // e.g., "John Doe - ER 1"
  staffId: integer('staff_id').references(() => users.id).notNull(),
  triageLevel: varchar('triage_level', { length: 50 }).notNull(), // Resuscitation, Emergent, Urgent, Less Urgent, Non-Urgent
  chiefComplaint: text('chief_complaint').notNull(),
  mechanismOfInjury: text('mechanism_of_injury'),
  status: varchar('status', { length: 50 }).notNull().default('Active'), // Active, Admitted, Discharged, Deceased
  arrivalTime: timestamp('arrival_time').defaultNow().notNull(),
  dischargedTime: timestamp('discharged_time'),
});

export const medicationAdministrations = pgTable('medication_administrations', {
  id: serial('id').primaryKey(),
  prescriptionId: integer('prescription_id').references(() => prescriptions.id).notNull(),
  nurseId: integer('nurse_id').references(() => users.id).notNull(),
  administeredAt: timestamp('administered_at').defaultNow().notNull(),
  notes: text('notes'),
});

export const labResults = pgTable('lab_results', {
  id: serial('id').primaryKey(),
  patientId: integer('patient_id').references(() => patients.id).notNull(),
  doctorId: integer('doctor_id').references(() => users.id).notNull(),
  testName: varchar('test_name', { length: 255 }).notNull(),
  result: text('result'),
  status: varchar('status', { length: 50 }).notNull().default('Pending'), // Pending, Completed
  priority: varchar('priority', { length: 50 }).notNull().default('Routine'), // Routine, Urgent, Emergency
  dateRequested: timestamp('date_requested').defaultNow().notNull(),
  dateCompleted: timestamp('date_completed'),
  validatedBy: varchar('validated_by', { length: 255 }),
  reportUrl: varchar('report_url', { length: 255 }),
});

export const imagingResults = pgTable('imaging_results', {
  id: serial('id').primaryKey(),
  patientId: integer('patient_id').references(() => patients.id).notNull(),
  doctorId: integer('doctor_id').references(() => users.id).notNull(),
  procedureName: varchar('procedure_name', { length: 255 }).notNull(),
  resultText: text('result_text'),
  status: varchar('status', { length: 50 }).notNull().default('Pending'), // Pending, Scheduled, Completed
  priority: varchar('priority', { length: 50 }).notNull().default('Routine'), // Routine, Urgent, Emergency
  scheduledDate: timestamp('scheduled_date'),
  dateRequested: timestamp('date_requested').defaultNow().notNull(),
  dateCompleted: timestamp('date_completed'),
  validatedBy: varchar('validated_by', { length: 255 }),
  reportUrl: varchar('report_url', { length: 255 }),
});

export const prescriptions = pgTable('prescriptions', {
  id: serial('id').primaryKey(),
  patientId: integer('patient_id').references(() => patients.id).notNull(),
  doctorId: integer('doctor_id').references(() => users.id).notNull(),
  medication: varchar('medication', { length: 255 }).notNull(),
  dosage: varchar('dosage', { length: 100 }).notNull(),
  instructions: text('instructions'),
  status: varchar('status', { length: 50 }).notNull().default('Pending'), // Pending, Dispensed
  dispensedDate: timestamp('dispensed_date'),
  prescribedDate: timestamp('prescribed_date').defaultNow().notNull(),
});

export const inventory = pgTable('inventory', {
  id: serial('id').primaryKey(),
  medicationName: varchar('medication_name', { length: 255 }).notNull().unique(),
  stockLevel: integer('stock_level').notNull().default(0),
  reorderLevel: integer('reorder_level').notNull().default(20),
  unitPrice: decimal('unit_price', { precision: 10, scale: 2 }).notNull(),
  lastUpdated: timestamp('last_updated').defaultNow().notNull(),
});

export const invoices = pgTable('invoices', {
  id: serial('id').primaryKey(),
  patientId: integer('patient_id').references(() => patients.id).notNull(),
  amount: decimal('amount', { precision: 10, scale: 2 }).notNull(),
  status: varchar('status', { length: 50 }).notNull().default('Unpaid'), // Unpaid, Paid, Cancelled
  description: text('description'),
  issuedBy: integer('issued_by').references(() => users.id),
  dueDate: timestamp('due_date').notNull(),
  paidAt: timestamp('paid_at'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

export const wards = pgTable('wards', {
  id: serial('id').primaryKey(),
  name: varchar('name', { length: 120 }).notNull().unique(),
  specialty: varchar('specialty', { length: 120 }),
  location: varchar('location', { length: 120 }),
  active: boolean('active').notNull().default(true),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

export const wardBeds = pgTable('ward_beds', {
  id: serial('id').primaryKey(),
  wardId: integer('ward_id').references(() => wards.id, { onDelete: 'cascade' }).notNull(),
  bedNumber: varchar('bed_number', { length: 30 }).notNull(),
  status: varchar('status', { length: 20 }).notNull().default('Available'),
}, (table) => [
  uniqueIndex('ward_beds_ward_number_idx').on(table.wardId, table.bedNumber),
]);

export const wardAdmissions = pgTable('ward_admissions', {
  id: serial('id').primaryKey(),
  admissionNumber: varchar('admission_number', { length: 40 }).notNull().unique(),
  patientId: integer('patient_id').references(() => patients.id).notNull(),
  source: varchar('source', { length: 60 }).notNull(),
  sourceDetails: text('source_details'),
  diagnosis: text('diagnosis').notNull(),
  attendingDoctorId: integer('attending_doctor_id').references(() => users.id),
  wardId: integer('ward_id').references(() => wards.id).notNull(),
  bedId: integer('bed_id').references(() => wardBeds.id),
  status: varchar('status', { length: 20 }).notNull().default('Admitted'),
  admittedAt: timestamp('admitted_at').defaultNow().notNull(),
  admittedBy: integer('admitted_by').references(() => users.id),
  dischargedAt: timestamp('discharged_at'),
  dischargeSummary: text('discharge_summary'),
  finalInvoiceId: integer('final_invoice_id').references(() => invoices.id),
}, (table) => [
  index('ward_admissions_patient_idx').on(table.patientId, table.status),
  index('ward_admissions_ward_idx').on(table.wardId, table.status),
  uniqueIndex('ward_admissions_one_active_patient_idx').on(table.patientId).where(sql`${table.status} = 'Admitted'`),
  uniqueIndex('ward_admissions_one_active_bed_idx').on(table.bedId).where(sql`${table.status} = 'Admitted' AND ${table.bedId} IS NOT NULL`),
  uniqueIndex('ward_admissions_final_invoice_idx').on(table.finalInvoiceId).where(sql`${table.finalInvoiceId} IS NOT NULL`),
]);

export const wardCareEntries = pgTable('ward_care_entries', {
  id: serial('id').primaryKey(),
  admissionId: integer('admission_id').references(() => wardAdmissions.id).notNull(),
  authorId: integer('author_id').references(() => users.id),
  entryType: varchar('entry_type', { length: 30 }).notNull(),
  note: text('note').notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
}, (table) => [index('ward_care_admission_time_idx').on(table.admissionId, table.createdAt)]);

export const wardTransfers = pgTable('ward_transfers', {
  id: serial('id').primaryKey(),
  admissionId: integer('admission_id').references(() => wardAdmissions.id).notNull(),
  fromWardId: integer('from_ward_id').references(() => wards.id),
  fromBedId: integer('from_bed_id').references(() => wardBeds.id),
  toWardId: integer('to_ward_id').references(() => wards.id).notNull(),
  toBedId: integer('to_bed_id').references(() => wardBeds.id),
  reason: text('reason').notNull(),
  transferredBy: integer('transferred_by').references(() => users.id),
  transferredAt: timestamp('transferred_at').defaultNow().notNull(),
});

// Relations
export const usersRelations = relations(users, ({ many }) => ({
  appointmentsAsDoctor: many(appointments),
}));

export const patientsRelations = relations(patients, ({ one, many }) => ({
  user: one(users, {
    fields: [patients.userId],
    references: [users.id],
  }),
  appointments: many(appointments),
  medicalRecords: many(medicalRecords),
  labResults: many(labResults),
  imagingResults: many(imagingResults),
  prescriptions: many(prescriptions),
  invoices: many(invoices),
  vitals: many(vitals),
  triages: many(patientTriage),
}));

export const appointmentsRelations = relations(appointments, ({ one }) => ({
  patient: one(patients, {
    fields: [appointments.patientId],
    references: [patients.id],
  }),
  doctor: one(users, {
    fields: [appointments.doctorId],
    references: [users.id],
  }),
}));

export const medicalRecordsRelations = relations(medicalRecords, ({ one }) => ({
  patient: one(patients, {
    fields: [medicalRecords.patientId],
    references: [patients.id],
  }),
  doctor: one(users, {
    fields: [medicalRecords.doctorId],
    references: [users.id],
  }),
}));

export const labResultsRelations = relations(labResults, ({ one }) => ({
  patient: one(patients, {
    fields: [labResults.patientId],
    references: [patients.id],
  }),
  doctor: one(users, {
    fields: [labResults.doctorId],
    references: [users.id],
  }),
}));

export const imagingResultsRelations = relations(imagingResults, ({ one }) => ({
  patient: one(patients, {
    fields: [imagingResults.patientId],
    references: [patients.id],
  }),
  doctor: one(users, {
    fields: [imagingResults.doctorId],
    references: [users.id],
  }),
}));

export const prescriptionsRelations = relations(prescriptions, ({ one, many }) => ({
  patient: one(patients, {
    fields: [prescriptions.patientId],
    references: [patients.id],
  }),
  doctor: one(users, {
    fields: [prescriptions.doctorId],
    references: [users.id],
  }),
  administrations: many(medicationAdministrations),
}));

export const vitalsRelations = relations(vitals, ({ one }) => ({
  patient: one(patients, {
    fields: [vitals.patientId],
    references: [patients.id],
  }),
  nurse: one(users, {
    fields: [vitals.nurseId],
    references: [users.id],
  }),
}));

export const patientTriageRelations = relations(patientTriage, ({ one }) => ({
  patient: one(patients, {
    fields: [patientTriage.patientId],
    references: [patients.id],
  }),
  staff: one(users, {
    fields: [patientTriage.staffId],
    references: [users.id],
  }),
  vitals: one(vitals, {
    fields: [patientTriage.vitalsId],
    references: [vitals.id],
  }),
}));

export const emergencyTriageRelations = relations(emergencyTriage, ({ one }) => ({
  patient: one(patients, {
    fields: [emergencyTriage.patientId],
    references: [patients.id],
  }),
  staff: one(users, {
    fields: [emergencyTriage.staffId],
    references: [users.id],
  }),
}));

export const medicationAdministrationsRelations = relations(medicationAdministrations, ({ one }) => ({
  prescription: one(prescriptions, {
    fields: [medicationAdministrations.prescriptionId],
    references: [prescriptions.id],
  }),
  nurse: one(users, {
    fields: [medicationAdministrations.nurseId],
    references: [users.id],
  }),
}));

export const systemAuditTrailRelations = relations(systemAuditTrail, ({ one }) => ({
  user: one(users, {
    fields: [systemAuditTrail.userId],
    references: [users.id],
  }),
}));

export const supportTicketsRelations = relations(supportTickets, ({ one }) => ({
  user: one(users, {
    fields: [supportTickets.userId],
    references: [users.id],
  }),
}));

export const recordAuditsRelations = relations(recordAudits, ({ one }) => ({
  patient: one(patients, {
    fields: [recordAudits.patientId],
    references: [patients.id],
  }),
  officer: one(users, {
    fields: [recordAudits.officerId],
    references: [users.id],
  }),
}));

export const invoicesRelations = relations(invoices, ({ one }) => ({
  patient: one(patients, {
    fields: [invoices.patientId],
    references: [patients.id],
  }),
}));
