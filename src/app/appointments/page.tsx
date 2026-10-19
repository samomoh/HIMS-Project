import { db } from '@/db';
import { appointments } from '@/db/schema';
import { desc } from 'drizzle-orm';
import { Calendar, Clock, User as UserIcon } from 'lucide-react';
import Link from 'next/link';

export const dynamic = 'force-dynamic';

export default async function AppointmentsPage() {
  const appointmentsData = await db.query.appointments.findMany({
    with: {
      patient: true,
      doctor: true,
    },
    orderBy: [desc(appointments.appointmentDate)],
  });

  return (
    <div className="space-y-6">
      <div className="sm:flex sm:items-center">
        <div className="sm:flex-auto">
          <h1 className="text-2xl font-bold leading-6 text-gray-900">Appointments</h1>
          <p className="mt-2 text-sm text-gray-700">
            Manage all hospital appointments, schedule new ones, and view upcoming schedules.
          </p>
        </div>
        <div className="mt-4 sm:ml-16 sm:mt-0 sm:flex-none">
          <Link href="/appointments/new" className="flex items-center rounded-md bg-blue-600 px-3 py-2 text-center text-sm font-semibold text-white shadow-sm hover:bg-blue-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600">
            <Calendar className="mr-1 h-4 w-4" /> New appointment
          </Link>
        </div>
      </div>

      <div className="overflow-hidden bg-white shadow-sm ring-1 ring-gray-200 sm:rounded-lg">
        <ul role="list" className="divide-y divide-gray-100">
          {appointmentsData.length === 0 ? (
            <li className="p-10 text-center">
              <Calendar className="mx-auto h-12 w-12 text-gray-300" />
              <h3 className="mt-2 text-sm font-semibold text-gray-900">No appointments scheduled</h3>
            </li>
          ) : (
            appointmentsData.map((apt) => (
              <li key={apt.id} className="relative flex justify-between gap-x-6 px-4 py-5 hover:bg-gray-50 sm:px-6">
                <div className="flex min-w-0 gap-x-4">
                  <div className="h-12 w-12 flex-none rounded-full bg-blue-50 flex items-center justify-center text-blue-600">
                    <UserIcon className="h-6 w-6" />
                  </div>
                  <div className="min-w-0 flex-auto">
                    <p className="text-sm font-semibold leading-6 text-gray-900">
                      <Link href={`/patients/${apt.patient.id}`}>
                        <span className="absolute inset-x-0 -top-px bottom-0" />
                        {apt.patient.firstName} {apt.patient.lastName}
                      </Link>
                    </p>
                    <p className="mt-1 flex text-xs leading-5 text-gray-500">
                      <span className="relative truncate">Reason: {apt.reason || 'Not specified'}</span>
                    </p>
                  </div>
                </div>
                <div className="flex shrink-0 items-center gap-x-6">
                  <div className="hidden sm:flex sm:flex-col sm:items-end">
                    <p className="text-sm leading-6 text-gray-900 flex items-center gap-1">
                      <Clock className="h-4 w-4 text-gray-400" />
                      {new Date(apt.appointmentDate).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' })}
                    </p>
                    <p className="mt-1 text-xs leading-5 text-gray-500">
                      Dr. {apt.doctor.name}
                    </p>
                  </div>
                  <span className={`inline-flex items-center rounded-md px-2 py-1 text-xs font-medium ring-1 ring-inset ${
                    apt.status === 'Completed' ? 'bg-green-50 text-green-700 ring-green-600/20' : 
                    apt.status === 'Scheduled' ? 'bg-blue-50 text-blue-700 ring-blue-600/20' : 'bg-gray-50 text-gray-600 ring-gray-500/10'
                  }`}>
                    {apt.status}
                  </span>
                </div>
              </li>
            ))
          )}
        </ul>
      </div>
    </div>
  );
}
