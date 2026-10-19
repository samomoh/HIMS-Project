'use server';

import { db } from '@/db';
import { users } from '@/db/schema';
import { eq, ne } from 'drizzle-orm';
import { revalidatePath } from 'next/cache';
import { logAuditTrail } from '@/lib/audit';
import { requireUser } from '@/lib/auth';
import { ROLES } from '@/lib/session-token';
import { requestPasswordResetAction } from '@/app/auth/reset-password/actions';

function validateStaff(data: { name: string; email: string; role: string }) {
  const email = data.email.trim().toLowerCase();
  if (!data.name.trim() || data.name.length > 255 || email.length > 255 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || !ROLES.includes(data.role as (typeof ROLES)[number])) {
    throw new Error('Enter a valid name, email, and staff role.');
  }
  return { name: data.name.trim(), email, role: data.role };
}

export async function createStaffAction(data: { name: string; email: string; role: string }) {
  const actor = await requireUser(['super_admin']);
  const staff = validateStaff(data);
  await db.insert(users).values(staff);
  await logAuditTrail(actor.id, 'Created Staff', 'Staff Management', `Created staff member ${data.name} (${data.role})`);
  await requestPasswordResetAction(staff.email);
  revalidatePath('/staff');
}

export async function updateStaffAction(id: number, data: { name: string; email: string; role: string }) {
  const actor = await requireUser(['super_admin']);
  if (!Number.isSafeInteger(id) || id <= 0) throw new Error('Invalid staff id.');
  await db.update(users).set(validateStaff(data)).where(eq(users.id, id));
  await logAuditTrail(actor.id, 'Updated Staff', 'Staff Management', `Updated staff member ID ${id} details`);
  revalidatePath('/staff');
}

export async function deleteStaffAction(id: number) {
  const actor = await requireUser(['super_admin']);
  if (!Number.isSafeInteger(id) || id <= 0 || id === actor.id) throw new Error('Invalid staff id. An administrator cannot delete their own account.');
  await db.delete(users).where(eq(users.id, id));
  await logAuditTrail(actor.id, 'Deleted Staff', 'Staff Management', `Deleted staff member ID ${id}`);
  revalidatePath('/staff');
}

export async function batchCreateStaffAction(staffList: { name: string; email: string; role: string }[]) {
  const actor = await requireUser(['super_admin']);
  if (!Array.isArray(staffList) || staffList.length === 0 || staffList.length > 100) throw new Error('Import between 1 and 100 staff records.');
  const staffRecords = staffList.map(validateStaff);
  const created = await db.transaction(async (tx) => tx.insert(users).values(staffRecords)
    .onConflictDoNothing({ target: users.email }).returning({ email: users.email }));
  await Promise.all(created.map((item) => requestPasswordResetAction(item.email)));
  await logAuditTrail(actor.id, 'Imported Staff', 'Staff Management', `Imported ${created.length} staff accounts.`);
  revalidatePath('/staff');
}
