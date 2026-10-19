'use server';

import { and, eq, inArray } from 'drizzle-orm';
import { revalidatePath } from 'next/cache';
import { db } from '@/db';
import { appointments, patients, users } from '@/db/schema';
import { requireUser } from '@/lib/auth';

export async function createAppointmentAction(data: { patientId: number; doctorId: number; appointmentDate: string; reason: string }) {
  const actor = await requireUser(['super_admin', 'admin', 'doctor', 'specialist', 'receptionist']);
  if (!Number.isSafeInteger(data.patientId) || data.patientId <= 0 || !Number.isSafeInteger(data.doctorId) || data.doctorId <= 0 || typeof data.reason !== 'string' || data.reason.length > 2000) throw new Error('Appointment details are invalid.');
  const appointmentDate = new Date(data.appointmentDate);
  if (Number.isNaN(appointmentDate.getTime()) || appointmentDate.getTime() < Date.now()) throw new Error('Choose a future appointment time.');
  const [patient, doctor] = await Promise.all([
    db.query.patients.findFirst({ where: eq(patients.id, data.patientId) }),
    db.query.users.findFirst({ where: and(eq(users.id, data.doctorId), inArray(users.role, ['doctor', 'specialist'])) }),
  ]);
  if (!patient || !doctor) throw new Error('The selected patient or clinician is no longer available.');
  await db.insert(appointments).values({ patientId: patient.id, doctorId: doctor.id, appointmentDate, reason: data.reason.trim() || null, status: 'Scheduled' });
  await Promise.all([revalidatePath('/appointments'), revalidatePath('/')]);
  return { success: true };
}
