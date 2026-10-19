'use server';

import { db } from '@/db';
import { users } from '@/db/schema';
import { eq } from 'drizzle-orm';
import { requireUser } from '@/lib/auth';
import { ROLES } from '@/lib/session-token';
import { revalidatePath } from 'next/cache';
import { logAuditTrail } from '@/lib/audit';

export async function updateStaffIDDetailsAction(id: number, data: {
  name: string;
  email: string;
  role: string;
  department?: string;
  contactNumber?: string;
  hireDate?: string;
  licenseNumber?: string;
}) {
  const actor = await requireUser(['super_admin', 'admin']);
  if (!Number.isSafeInteger(id) || id <= 0 || !data.name.trim() || data.name.length > 255 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email.trim()) || !ROLES.includes(data.role as (typeof ROLES)[number])) throw new Error('Staff ID details are invalid.');
  const existing = await db.query.users.findFirst({ where: eq(users.id, id) });
  if (!existing) throw new Error('Staff account not found.');
  if (actor.role !== 'super_admin' && existing.role !== data.role) throw new Error('Only a super administrator can change staff roles.');
  await db.update(users).set({
    name: data.name,
    email: data.email,
    role: data.role,
    department: data.department || null,
    contactNumber: data.contactNumber || null,
    hireDate: data.hireDate || null,
    licenseNumber: data.licenseNumber || null,
  }).where(eq(users.id, id));

  await logAuditTrail(actor.id, 'Updated Staff ID Details', 'ID Cards', `Updated ID card details for staff ID ${id}`);
  revalidatePath('/id-cards');
}
