'use server';

import { db } from '@/db';
import { staffPhotos, systemAuditTrail, users } from '@/db/schema';
import { eq, sql } from 'drizzle-orm';
import { revalidatePath } from 'next/cache';
import { logAuditTrail } from '@/lib/audit';
import { requireUser } from '@/lib/auth';
import { ROLES } from '@/lib/session-token';
import { requestPasswordResetAction } from '@/app/auth/reset-password/actions';

function validateStaff(data: unknown) {
  if (!data || typeof data !== 'object' || Array.isArray(data)) throw new Error('Enter valid staff details.');
  const value = data as Record<string, unknown>;
  const name = value.name;
  const emailValue = value.email;
  const role = value.role;
  const department = value.department;
  const contactNumber = value.contactNumber;
  const hireDate = value.hireDate;
  const licenseNumber = value.licenseNumber;
  if (typeof name !== 'string' || typeof emailValue !== 'string' || typeof role !== 'string') throw new Error('Enter valid staff details.');
  const email = emailValue.trim().toLowerCase();
  const normalizedHireDate = typeof hireDate === 'string' && hireDate ? hireDate : null;
  if (!name.trim() || name.length > 255 || email.length > 255 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || !ROLES.includes(role as (typeof ROLES)[number])
    || (department != null && (typeof department !== 'string' || department.length > 100))
    || (contactNumber != null && (typeof contactNumber !== 'string' || contactNumber.length > 50))
    || (licenseNumber != null && (typeof licenseNumber !== 'string' || licenseNumber.length > 100))
    || (normalizedHireDate !== null && (!/^\d{4}-\d{2}-\d{2}$/.test(normalizedHireDate) || Number.isNaN(Date.parse(`${normalizedHireDate}T00:00:00Z`)) || new Date(`${normalizedHireDate}T00:00:00Z`).toISOString().slice(0, 10) !== normalizedHireDate))) {
    throw new Error('Enter a valid name, email, and staff role.');
  }
  return {
    name: name.trim(), email, role,
    department: typeof department === 'string' && department.trim() ? department.trim() : null,
    contactNumber: typeof contactNumber === 'string' && contactNumber.trim() ? contactNumber.trim() : null,
    hireDate: normalizedHireDate,
    licenseNumber: typeof licenseNumber === 'string' && licenseNumber.trim() ? licenseNumber.trim() : null,
  };
}

export async function createStaffAction(data: unknown) {
  const actor = await requireUser(['super_admin']);
  const staff = validateStaff(data);
  const [created] = await db.insert(users).values(staff).returning({ id: users.id, createdAt: users.createdAt });
  await logAuditTrail(actor.id, 'Created Staff', 'Staff Management', `Created staff member ${staff.name} (${staff.role})`);
  await requestPasswordResetAction(staff.email);
  revalidatePath('/staff');
  return { ...staff, id: created.id, photoMimeType: null, createdAt: created.createdAt };
}

export async function updateStaffAction(id: number, data: unknown) {
  const actor = await requireUser(['super_admin', 'admin', 'hr']);
  if (!Number.isSafeInteger(id) || id <= 0) throw new Error('Invalid staff id.');
  const existing = await db.query.users.findFirst({ where: eq(users.id, id), columns: { id: true, role: true } });
  if (!existing) throw new Error('Staff account not found.');
  if (actor.role !== 'super_admin' && ['admin', 'super_admin'].includes(existing.role)) {
    throw new Error('Only a super administrator can edit admin or super administrator accounts.');
  }
  const staff = validateStaff(data);
  if (actor.role !== 'super_admin' && staff.role !== existing.role) {
    throw new Error('Only a super administrator can change staff roles.');
  }
  await db.update(users).set(staff).where(eq(users.id, id));
  try {
    await logAuditTrail(actor.id, 'Updated Staff', 'Staff Management', `Updated staff member ID ${id} details`);
  } catch (error) {
    console.error('Staff update audit logging failed:', error);
  }
  revalidatePath('/staff');
  revalidatePath('/id-cards');
}

export async function deleteStaffAction(id: number) {
  const actor = await requireUser(['super_admin', 'admin']);
  if (!Number.isSafeInteger(id) || id <= 0 || id === actor.id) throw new Error('You cannot delete your own account.');
  const existing = await db.query.users.findFirst({ where: eq(users.id, id), columns: { id: true, name: true, role: true } });
  if (!existing || existing.role === 'patient') throw new Error('Staff account not found.');
  if (actor.role !== 'super_admin' && ['admin', 'super_admin'].includes(existing.role)) {
    throw new Error('Only a super administrator can delete admin accounts.');
  }

  const references = await db.execute<{ references: number }>(sql`SELECT
    (SELECT count(*) FROM support_tickets WHERE user_id = ${id}) +
    (SELECT count(*) FROM appointments WHERE doctor_id = ${id}) +
    (SELECT count(*) FROM medical_records WHERE doctor_id = ${id}) +
    (SELECT count(*) FROM vitals WHERE nurse_id = ${id}) +
    (SELECT count(*) FROM patient_triage WHERE staff_id = ${id}) +
    (SELECT count(*) FROM emergency_triage WHERE staff_id = ${id}) +
    (SELECT count(*) FROM lab_results WHERE doctor_id = ${id}) +
    (SELECT count(*) FROM imaging_results WHERE doctor_id = ${id}) +
    (SELECT count(*) FROM prescriptions WHERE doctor_id = ${id}) +
    (SELECT count(*) FROM medication_administrations WHERE nurse_id = ${id}) +
    (SELECT count(*) FROM record_audits WHERE officer_id = ${id}) +
    (SELECT count(*) FROM invoices WHERE issued_by = ${id}) +
    (SELECT count(*) FROM patients WHERE user_id = ${id}) AS reference_count`);
  if (Number(references.rows[0]?.reference_count) > 0) {
    throw new Error('This staff account has linked clinical or support history and cannot be deleted.');
  }
  await logAuditTrail(actor.id, 'Deleted Staff', 'Staff Management', `Deleted staff member ${existing.name} (ID ${id})`);
  // Keep prior audit entries while removing their optional user association.
  await db.update(systemAuditTrail).set({ userId: null }).where(eq(systemAuditTrail.userId, id));
  await db.delete(staffPhotos).where(eq(staffPhotos.userId, id));
  await db.delete(users).where(eq(users.id, id));
  revalidatePath('/staff');
  revalidatePath('/id-cards');
}

export async function batchCreateStaffAction(staffList: { name: string; email: string; role: string }[]) {
  const actor = await requireUser(['super_admin']);
  if (!Array.isArray(staffList) || staffList.length === 0 || staffList.length > 100) throw new Error('Import between 1 and 100 staff records.');
  const staffRecords = staffList.map((staff) => validateStaff(staff));
  const created = await db.transaction(async (tx) => tx.insert(users).values(staffRecords)
    .onConflictDoNothing({ target: users.email }).returning({ email: users.email }));
  await Promise.all(created.map((item) => requestPasswordResetAction(item.email)));
  await logAuditTrail(actor.id, 'Imported Staff', 'Staff Management', `Imported ${created.length} staff accounts.`);
  revalidatePath('/staff');
}
