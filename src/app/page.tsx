import { db } from '@/db';
import { patients, appointments, invoices, users } from '@/db/schema';
import { sql } from 'drizzle-orm';
import { Users, Calendar, DollarSign, Activity, ChevronRight } from 'lucide-react';
import Link from 'next/link';

export const dynamic = 'force-dynamic';

import { emergencyTriage, labResults } from '@/db/schema';
import DashboardCharts from './DashboardCharts';
import { requireUser } from '@/lib/auth';

export default async function DashboardPage() {
  const actor = await requireUser();
  const canSeeFinancial = ['super_admin', 'admin', 'receptionist'].includes(actor.role);
  const canSeeAppointments = ['super_admin', 'admin', 'doctor', 'specialist', 'nurse', 'receptionist', 'emergency', 'medical_records'].includes(actor.role);
  // Fetch stats concurrently
  const [
    [{ count: totalPatients }],
    [{ count: totalAppointments }],
    [{ count: activeER }],
    revenueRows,
    [{ count: pendingLabs }]
  ] = await Promise.all([
    db.select({ count: sql<number>`count(*)` }).from(patients),
    db.select({ count: sql<number>`count(*)` }).from(appointments),
    db.select({ count: sql<number>`count(*)` }).from(emergencyTriage).where(sql`${emergencyTriage.status} = 'Active'`),
    canSeeFinancial ? db.select({ revenue: sql<number>`sum(amount)` }).from(invoices).where(sql`${invoices.status} = 'Paid'`) : Promise.resolve([{ revenue: null }]),
    db.select({ count: sql<number>`count(*)` }).from(labResults).where(sql`${labResults.status} = 'Pending'`),
  ]);
  const totalRevenue = revenueRows[0]?.revenue;

  const recentAppointments = canSeeAppointments ? await db.query.appointments.findMany({
    with: {
      patient: true,
      doctor: true,
    },
    orderBy: (appointments, { desc }) => [desc(appointments.appointmentDate)],
    limit: 5,
  }) : [];

  const stats = [
    { name: 'Total registered patients', stat: totalPatients || 0, icon: Users, color: 'bg-[#087e83]' },
    { name: 'Upcoming appointments', stat: totalAppointments || 0, icon: Calendar, color: 'bg-[#438d78]' },
    { name: 'Active ER cases', stat: activeER || 0, icon: Activity, color: 'bg-[#c46a54]' },
    { name: 'Pending lab tests', stat: pendingLabs || 0, icon: Activity, color: 'bg-[#6684a0]' },
    { name: 'Gross revenue (paid)', stat: `SLe ${Number(totalRevenue || 0).toLocaleString()}`, icon: DollarSign, color: 'bg-[#a68348]' },
  ].filter((item) => item.name !== 'Gross revenue (paid)' || canSeeFinancial);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <p className="mb-1 text-xs font-semibold uppercase tracking-[0.16em] text-[#087e83]">Clinical operations</p>
          <h1 className="text-2xl font-bold text-gray-900">Hospital overview</h1>
          <p className="mt-1 text-sm text-slate-500">A live view of patient care and hospital activity.</p>
        </div>
        <div className="flex items-center gap-2">
          <span className="inline-flex items-center rounded-md bg-green-50 px-2 py-1 text-xs font-medium text-green-700 ring-1 ring-inset ring-green-600/20">
            Database connection: available
          </span>
          <span className="inline-flex items-center rounded-md bg-blue-50 px-2 py-1 text-xs font-medium text-blue-700 ring-1 ring-inset ring-blue-700/10">
            AI assistant: preview
          </span>
        </div>
      </div>

      <div className={`grid grid-cols-1 gap-4 sm:grid-cols-2 ${canSeeFinancial ? 'lg:grid-cols-5' : 'lg:grid-cols-4'}`}>
        {stats.map((item) => (
          <div key={item.name} className="overflow-hidden rounded-xl bg-white shadow-sm ring-1 ring-gray-200">
            <div className="p-5">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <div className={`flex h-10 w-10 items-center justify-center rounded-md ${item.color} text-white`}>
                    <item.icon className="h-5 w-5" aria-hidden="true" />
                  </div>
                </div>
                <div className="ml-4 w-0 flex-1">
                  <dl>
                    <dt className="truncate text-xs font-medium text-gray-500">{item.name}</dt>
                    <dd className="mt-1 text-2xl font-bold tracking-tight text-gray-900">{item.stat}</dd>
                  </dl>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      <DashboardCharts showRevenue={canSeeFinancial} />

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {canSeeAppointments && <>
        {/* Recent Appointments */}
        <div className="overflow-hidden rounded-xl bg-white shadow-sm ring-1 ring-gray-200">
          <div className="border-b border-gray-200 px-6 py-5 flex items-center justify-between">
            <h3 className="text-base font-semibold leading-6 text-gray-900">Recent Appointments</h3>
            <Link href="/appointments" className="text-sm font-medium text-blue-600 hover:text-blue-500 flex items-center">
              View all <ChevronRight className="h-4 w-4 ml-1" />
            </Link>
          </div>
          <ul role="list" className="divide-y divide-gray-100">
            {recentAppointments.length === 0 ? (
              <li className="p-6 text-center text-sm text-gray-500">No appointments found.</li>
            ) : (
              recentAppointments.map((apt) => (
                <li key={apt.id} className="relative flex justify-between gap-x-6 px-6 py-5 hover:bg-gray-50">
                  <div className="flex min-w-0 gap-x-4">
                    <div className="h-10 w-10 flex-none rounded-full bg-blue-100 flex items-center justify-center text-blue-600 font-bold">
                      {apt.patient.firstName[0]}{apt.patient.lastName[0]}
                    </div>
                    <div className="min-w-0 flex-auto">
                      <p className="text-sm font-semibold leading-6 text-gray-900">
                        {apt.patient.firstName} {apt.patient.lastName}
                      </p>
                      <p className="mt-1 flex text-xs leading-5 text-gray-500">
                        With {apt.doctor.name}
                      </p>
                    </div>
                  </div>
                  <div className="flex shrink-0 items-center gap-x-4">
                    <div className="hidden sm:flex sm:flex-col sm:items-end">
                      <p className="text-sm leading-6 text-gray-900">
                        {new Date(apt.appointmentDate).toLocaleDateString()}
                      </p>
                      <div className="mt-1 flex items-center gap-x-1.5">
                        <div className={`flex-none rounded-full p-1 ${
                          apt.status === 'Completed' ? 'bg-green-100 text-green-700' :
                          apt.status === 'Scheduled' ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-700'
                        }`}>
                          <div className="h-1.5 w-1.5 rounded-full bg-current" />
                        </div>
                        <p className="text-xs leading-5 text-gray-500">{apt.status}</p>
                      </div>
                    </div>
                  </div>
                </li>
              ))
            )}
          </ul>
        </div>
        </>}

        {/* AI Insights Card */}
        <div className="overflow-hidden rounded-xl bg-white shadow-sm ring-1 ring-gray-200">
          <div className="border-b border-gray-200 px-6 py-5 bg-gradient-to-r from-indigo-50 to-purple-50 flex items-center gap-2">
            <Activity className="h-5 w-5 text-indigo-600" />
            <h3 className="text-base font-semibold leading-6 text-indigo-900">Operational insight examples</h3>
          </div>
          <div className="p-6 space-y-6">
            <div className="rounded-md bg-indigo-50 p-4">
              <div className="flex">
                <div className="flex-shrink-0">
                  <Activity className="h-5 w-5 text-indigo-400" aria-hidden="true" />
                </div>
                <div className="ml-3 flex-1 md:flex md:justify-between">
                  <p className="text-sm text-indigo-700">
                    <strong>Sample insight:</strong> Patient-load forecasting is not connected. Configure validated arrival history before using staffing projections.
                  </p>
                </div>
              </div>
            </div>

            <div className="rounded-md bg-yellow-50 p-4">
              <div className="flex">
                <div className="flex-shrink-0">
                  <Calendar className="h-5 w-5 text-yellow-400" aria-hidden="true" />
                </div>
                <div className="ml-3 flex-1 md:flex md:justify-between">
                  <p className="text-sm text-yellow-700">
                    <strong>Sample alert:</strong> Inventory and symptom trends are not analyzed here. Check live stock and clinical surveillance reports.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
