'use server';

import { db } from '@/db';
import { prescriptions, inventory } from '@/db/schema';
import { and, eq, gte, sql } from 'drizzle-orm';
import { revalidatePath } from 'next/cache';
import { requireUser } from '@/lib/auth';
import { logAuditTrail } from '@/lib/audit';

export async function dispenseMedicationAction(prescriptionId: number, medicationName: string, quantityToDeduct: number) {
  const actor = await requireUser(['super_admin', 'admin', 'doctor', 'pharmacist']);
  if (!Number.isSafeInteger(prescriptionId) || prescriptionId <= 0 || !Number.isSafeInteger(quantityToDeduct) || quantityToDeduct <= 0 || !medicationName.trim() || medicationName.length > 255) {
    throw new Error('Invalid dispensing request.');
  }
  await db.transaction(async (tx) => {
    const [prescription] = await tx.update(prescriptions).set({ status: 'Dispensed', dispensedDate: new Date() })
      .where(and(eq(prescriptions.id, prescriptionId), eq(prescriptions.status, 'Pending'))).returning();
    if (!prescription) throw new Error('Prescription is already dispensed or no longer available.');
    if (prescription.medication.trim().toLowerCase() !== medicationName.trim().toLowerCase()) throw new Error('Selected stock item does not match the prescription.');
    const item = await tx.query.inventory.findFirst({ where: eq(inventory.medicationName, medicationName.trim()) });
    if (!item) throw new Error('The medication is not present in inventory.');
    const [updated] = await tx.update(inventory)
      .set({ stockLevel: sql`${inventory.stockLevel} - ${quantityToDeduct}` })
      .where(and(eq(inventory.id, item.id), gte(inventory.stockLevel, quantityToDeduct))).returning({ id: inventory.id });
    if (!updated) throw new Error('Insufficient stock to dispense this quantity.');
  });
  await logAuditTrail(actor.id, 'Dispensed Medication', 'Pharmacy', `Dispensed prescription #${prescriptionId}`);

  revalidatePath('/pharmacy');
  revalidatePath('/patients');
}

export async function updateInventoryAction(data: {
  id?: number;
  medicationName: string;
  stockLevel: number;
  reorderLevel: number;
  unitPrice: string;
}) {
  const actor = await requireUser(['super_admin', 'admin', 'pharmacist']);
  const price = Number(data.unitPrice);
  if (!data.medicationName.trim() || data.medicationName.length > 255 || !Number.isSafeInteger(data.stockLevel) || data.stockLevel < 0 || !Number.isSafeInteger(data.reorderLevel) || data.reorderLevel < 0 || !Number.isFinite(price) || price < 0 || data.unitPrice.length > 20) {
    throw new Error('Invalid inventory values.');
  }
  await logAuditTrail(actor.id, data.id ? 'Updated Inventory' : 'Added Inventory', 'Pharmacy', `${data.id ? 'Updated' : 'Added'} inventory item ${data.medicationName.trim()}`);
  if (data.id) {
    await db.update(inventory).set({
      medicationName: data.medicationName,
      stockLevel: data.stockLevel,
      reorderLevel: data.reorderLevel,
      unitPrice: data.unitPrice,
      lastUpdated: new Date()
    }).where(eq(inventory.id, data.id));
  } else {
    await db.insert(inventory).values({
      medicationName: data.medicationName,
      stockLevel: data.stockLevel,
      reorderLevel: data.reorderLevel,
      unitPrice: data.unitPrice,
    });
  }
  revalidatePath('/pharmacy');
}
