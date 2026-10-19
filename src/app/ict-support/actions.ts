'use server';

import { db } from '@/db';
import { supportTickets } from '@/db/schema';
import { eq } from 'drizzle-orm';
import { revalidatePath } from 'next/cache';
import { requireUser } from '@/lib/auth';
import { logAuditTrail } from '@/lib/audit';

export async function createTicketAction(data: {
  userId: number;
  subject: string;
  description: string;
  priority: string;
}) {
  const actor = await requireUser();
  if (!data.subject.trim() || data.subject.length > 255 || !data.description.trim() || data.description.length > 10000 || !['Low', 'Medium', 'High', 'Critical'].includes(data.priority)) throw new Error('Support ticket details are invalid.');
  await db.insert(supportTickets).values({
    userId: actor.id,
    subject: data.subject,
    description: data.description,
    priority: data.priority,
  });

  await logAuditTrail(actor.id, 'Created Support Ticket', 'ICT Support', `Subject: ${data.subject}`);
  revalidatePath('/ict-support');
}

export async function updateTicketStatusAction(ticketId: number, status: string, actorId: number) {
  const actor = await requireUser(['super_admin', 'admin', 'ict_support']);
  if (!Number.isSafeInteger(ticketId) || ticketId <= 0) throw new Error('Ticket id is invalid.');
  if (!['Open', 'In Progress', 'Resolved'].includes(status)) throw new Error('Invalid support ticket status.');
  await db.update(supportTickets).set({
    status,
    resolvedAt: status === 'Resolved' ? new Date() : null,
  }).where(eq(supportTickets.id, ticketId));

  await logAuditTrail(actor.id, `Updated Support Ticket`, 'ICT Support', `Ticket #${ticketId} status changed to ${status}`);
  revalidatePath('/ict-support');
}
