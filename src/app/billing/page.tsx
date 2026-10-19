import { db } from '@/db';
import { invoices, patients, users } from '@/db/schema';
import { desc, eq } from 'drizzle-orm';
import BillingClient from './BillingClient';

export const dynamic = 'force-dynamic';

export default async function BillingPage() {
  const allInvoices = await db.query.invoices.findMany({
    with: {
      patient: true,
    },
    orderBy: [desc(invoices.createdAt)],
  });

  const allPatients = await db.query.patients.findMany({
    orderBy: [desc(patients.createdAt)],
  });

  const billingStaff = await db.query.users.findMany({
    where: eq(users.role, 'receptionist'), // Or a dedicated billing role
  });

  return (
    <div className="space-y-6">
      <div className="sm:flex sm:items-center">
        <div className="sm:flex-auto">
          <h1 className="text-2xl font-bold leading-6 text-gray-900">Billing & Financial Services</h1>
          <p className="mt-2 text-sm text-gray-700">
            Create invoices, track patient payments, and monitor hospital revenue.
          </p>
        </div>
      </div>

      <BillingClient 
        initialInvoices={allInvoices} 
        patients={allPatients} 
        staff={billingStaff} 
      />
    </div>
  );
}
