import { db } from '@/db';
import { prescriptions, inventory } from '@/db/schema';
import { desc } from 'drizzle-orm';
import PharmacyClient from './PharmacyClient';

export const dynamic = 'force-dynamic';

export default async function PharmacyPage() {
  const allPrescriptions = await db.query.prescriptions.findMany({
    with: {
      patient: true,
      doctor: true,
    },
    orderBy: [desc(prescriptions.prescribedDate)],
  });

  const allInventory = await db.query.inventory.findMany({
    orderBy: [desc(inventory.lastUpdated)],
  });

  return (
    <div className="space-y-6">
      <div className="sm:flex sm:items-center">
        <div className="sm:flex-auto">
          <h1 className="text-2xl font-bold leading-6 text-gray-900">Pharmacy Central</h1>
          <p className="mt-2 text-sm text-gray-700">
            Process prescriptions, manage medication inventory, and monitor stock levels.
          </p>
        </div>
      </div>

      <PharmacyClient initialPrescriptions={allPrescriptions} initialInventory={allInventory} />
    </div>
  );
}
