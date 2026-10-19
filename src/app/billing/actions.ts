'use server';

import { db } from '@/db';
import { invoices } from '@/db/schema';
import { and, eq } from 'drizzle-orm';
import { revalidatePath } from 'next/cache';
import { logAuditTrail } from '@/lib/audit';
import { requireUser } from '@/lib/auth';

export async function createInvoiceAction(data: {
  patientId: number;
  amount: string;
  dueDate: Date;
  description: string;
  issuedBy: number;
}) {
  const actor = await requireUser(['super_admin', 'admin', 'receptionist']);
  if (!Number.isSafeInteger(data.patientId) || data.patientId <= 0 || !/^\d{1,8}(\.\d{1,2})?$/.test(data.amount) || !Number.isFinite(new Date(data.dueDate).getTime()) || data.description.length > 2000) throw new Error('Invoice details are invalid.');
  const [invoice] = await db.insert(invoices).values({
    patientId: data.patientId,
    amount: data.amount,
    dueDate: data.dueDate,
    description: data.description,
    issuedBy: actor.id,
    status: 'Unpaid'
  }).returning();

  await logAuditTrail(actor.id, 'Created Invoice', 'Billing', `Invoice #${invoice.id} for SLe ${data.amount}`);
  revalidatePath('/billing');
}

export async function markInvoicePaidAction(invoiceId: number, officerId: number) {
  const actor = await requireUser(['super_admin', 'admin', 'receptionist']);
  if (!Number.isSafeInteger(invoiceId) || invoiceId <= 0) throw new Error('Invoice id is invalid.');
  const [invoice] = await db.update(invoices).set({
    status: 'Paid',
    paidAt: new Date()
  }).where(and(eq(invoices.id, invoiceId), eq(invoices.status, 'Unpaid'))).returning({ id: invoices.id });
  if (!invoice) throw new Error('Invoice is already paid or unavailable.');

  await logAuditTrail(actor.id, 'Processed Payment', 'Billing', `Invoice #${invoiceId} marked as Paid`);
  revalidatePath('/billing');
}
