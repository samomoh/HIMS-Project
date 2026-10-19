'use client';

import { useState } from 'react';
import { Stethoscope, FileText, FlaskConical, Calendar, Search, Radiation, CheckSquare, Clock } from 'lucide-react';
import Link from 'next/link';

type Patient = any;
type Appointment = any;
type LabResult = any;
type ImagingResult = any;

export default function PhysicianClient({ 
  patients,
  appointments,
  recentLabs,
  recentImaging
}: { 
  patients: Patient[],
  appointments: Appointment[],
  recentLabs: LabResult[],
  recentImaging: ImagingResult[]
}) {
  const [activeTab, setActiveTab] = useState<'Patients' | 'Results' | 'Schedule'>('Patients');
  const [searchQuery, setSearchQuery] = useState('');

  const filteredPatients = patients.filter((p: any) => 
    p.firstName.toLowerCase().includes(searchQuery.toLowerCase()) || 
    p.lastName.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <>
      <div className="flex border-b border-gray-200 mb-6 space-x-2">
        <button
          onClick={() => setActiveTab('Patients')}
          className={`px-4 py-2 border-b-2 text-sm font-medium transition-colors flex items-center ${activeTab === 'Patients' ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}
        >
          <Stethoscope className="w-4 h-4 mr-2" /> My Patients & EMR
        </button>
        <button
          onClick={() => setActiveTab('Results')}
          className={`px-4 py-2 border-b-2 text-sm font-medium transition-colors flex items-center ${activeTab === 'Results' ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}
        >
          <FileText className="w-4 h-4 mr-2" /> Diagnostic Results Review
        </button>
        <button
          onClick={() => setActiveTab('Schedule')}
          className={`px-4 py-2 border-b-2 text-sm font-medium transition-colors flex items-center ${activeTab === 'Schedule' ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}
        >
          <Calendar className="w-4 h-4 mr-2" /> Schedule & Follow-ups
        </button>
      </div>

      {activeTab === 'Patients' && (
        <div className="space-y-6">
          <div className="relative max-w-md">
            <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
              <Search className="h-5 w-5 text-gray-400" />
            </div>
            <input
              type="text"
              placeholder="Search patients by name..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="block w-full rounded-md border-0 py-2 pl-10 text-gray-900 ring-1 ring-inset ring-gray-300 focus:ring-2 focus:ring-blue-600 sm:text-sm sm:leading-6"
            />
          </div>

          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {filteredPatients.map((patient: any) => (
              <div key={patient.id} className="bg-white overflow-hidden shadow-sm rounded-xl ring-1 ring-gray-200 flex flex-col">
                <div className="p-5 flex-1">
                  <div className="flex items-center gap-4 mb-4">
                    <div className="h-12 w-12 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 font-bold text-lg">
                      {patient.firstName[0]}{patient.lastName[0]}
                    </div>
                    <div>
                      <h3 className="text-lg font-bold text-gray-900">
                        {patient.firstName} {patient.lastName}
                      </h3>
                      <p className="text-xs text-gray-500">{patient.gender}, {new Date(patient.dob).toLocaleDateString()}</p>
                    </div>
                  </div>
                  <div className="space-y-2 mt-4">
                    <Link href={`/patients/${patient.id}/clinical-review`} className="w-full flex items-center justify-center rounded-md bg-indigo-50 px-3 py-2 text-sm font-semibold text-indigo-700 hover:bg-indigo-100 border border-indigo-200">
                      <Stethoscope className="h-4 w-4 mr-2" /> Conduct Clinical Review
                    </Link>
                    <Link href={`/patients/${patient.id}/review-results`} className="w-full flex items-center justify-center rounded-md bg-green-50 px-3 py-2 text-sm font-semibold text-green-700 hover:bg-green-100 border border-green-200">
                      <CheckSquare className="h-4 w-4 mr-2" /> Prescribe & Treat (Results)
                    </Link>
                  </div>
                </div>
                <div className="bg-gray-50 px-5 py-3 border-t border-gray-100">
                  <Link href={`/patients/${patient.id}`} className="w-full flex items-center justify-center rounded-md bg-white px-3 py-2 text-sm font-semibold text-gray-700 shadow-sm ring-1 ring-inset ring-gray-300 hover:bg-gray-100">
                    <FileText className="h-4 w-4 mr-2" /> Open Full EMR Profile
                  </Link>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {activeTab === 'Results' && (
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          {/* Lab Results to Review */}
          <div className="bg-white shadow-sm ring-1 ring-gray-200 rounded-xl overflow-hidden">
            <div className="px-4 py-4 sm:px-6 border-b border-gray-200 bg-gray-50 flex items-center">
              <FlaskConical className="h-5 w-5 text-gray-500 mr-2" />
              <h3 className="text-base font-semibold leading-6 text-gray-900">Recent Laboratory Results</h3>
            </div>
            <ul role="list" className="divide-y divide-gray-100">
              {recentLabs.length === 0 ? (
                <li className="p-6 text-center text-sm text-gray-500">No completed lab results pending review.</li>
              ) : (
                recentLabs.map((lab: any) => (
                  <li key={`lab-${lab.id}`} className="relative flex justify-between gap-x-6 px-4 py-5 hover:bg-gray-50">
                    <div className="flex min-w-0 gap-x-4">
                      <div className="min-w-0 flex-auto">
                        <p className="text-sm font-bold leading-6 text-gray-900">{lab.testName}</p>
                        <p className="mt-1 flex text-sm leading-5 text-gray-700">Patient: <Link href={`/patients/${lab.patient.id}`} className="font-semibold text-blue-600 ml-1 hover:underline">{lab.patient.firstName} {lab.patient.lastName}</Link></p>
                        <p className="mt-2 text-sm text-gray-600 bg-gray-100 p-2 rounded font-mono truncate">{lab.result}</p>
                      </div>
                    </div>
                    <div className="flex shrink-0 items-center gap-x-4 flex-col justify-center">
                       <Link href={`/patients/${lab.patient.id}/review-results`} className="rounded-md bg-green-600 px-3 py-2 text-xs font-semibold text-white shadow-sm hover:bg-green-500">
                         Action Result
                       </Link>
                    </div>
                  </li>
                ))
              )}
            </ul>
          </div>

          {/* Imaging Results to Review */}
          <div className="bg-white shadow-sm ring-1 ring-gray-200 rounded-xl overflow-hidden">
            <div className="px-4 py-4 sm:px-6 border-b border-gray-200 bg-gray-50 flex items-center">
              <Radiation className="h-5 w-5 text-gray-500 mr-2" />
              <h3 className="text-base font-semibold leading-6 text-gray-900">Recent Radiology Reports</h3>
            </div>
            <ul role="list" className="divide-y divide-gray-100">
              {recentImaging.length === 0 ? (
                <li className="p-6 text-center text-sm text-gray-500">No completed imaging results pending review.</li>
              ) : (
                recentImaging.map((img: any) => (
                  <li key={`img-${img.id}`} className="relative flex justify-between gap-x-6 px-4 py-5 hover:bg-gray-50">
                    <div className="flex min-w-0 gap-x-4">
                      <div className="min-w-0 flex-auto">
                        <p className="text-sm font-bold leading-6 text-gray-900">{img.procedureName}</p>
                        <p className="mt-1 flex text-sm leading-5 text-gray-700">Patient: <Link href={`/patients/${img.patient.id}`} className="font-semibold text-blue-600 ml-1 hover:underline">{img.patient.firstName} {img.patient.lastName}</Link></p>
                        <p className="mt-2 text-sm text-gray-600 bg-gray-100 p-2 rounded font-mono truncate">{img.resultText}</p>
                      </div>
                    </div>
                    <div className="flex shrink-0 items-center gap-x-4 flex-col justify-center">
                       <Link href={`/patients/${img.patient.id}/review-results`} className="rounded-md bg-green-600 px-3 py-2 text-xs font-semibold text-white shadow-sm hover:bg-green-500">
                         Action Result
                       </Link>
                    </div>
                  </li>
                ))
              )}
            </ul>
          </div>
        </div>
      )}

      {activeTab === 'Schedule' && (
        <div className="bg-white shadow-sm ring-1 ring-gray-200 rounded-xl overflow-hidden">
          <div className="px-4 py-5 sm:px-6 border-b border-gray-200 bg-gray-50 flex justify-between items-center">
            <div>
              <h3 className="text-base font-semibold leading-6 text-gray-900">My Appointments</h3>
              <p className="mt-1 max-w-2xl text-sm text-gray-500">Upcoming clinical reviews and scheduled follow-ups.</p>
            </div>
            <Link href="/appointments" className="rounded-md bg-blue-600 px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-blue-500">
               Manage Global Schedule
            </Link>
          </div>
          <ul role="list" className="divide-y divide-gray-100">
            {appointments.length === 0 ? (
              <li className="p-6 text-center text-sm text-gray-500">No appointments scheduled.</li>
            ) : (
              appointments.map((apt: any) => (
                <li key={apt.id} className="relative flex justify-between gap-x-6 px-4 py-5 hover:bg-gray-50 sm:px-6">
                  <div className="flex min-w-0 gap-x-4 items-center">
                    <div className="h-10 w-10 flex-none rounded-full bg-blue-50 flex items-center justify-center text-blue-600 font-bold">
                      {apt.patient.firstName[0]}{apt.patient.lastName[0]}
                    </div>
                    <div className="min-w-0 flex-auto">
                      <p className="text-sm font-bold leading-6 text-gray-900">
                        {apt.patient.firstName} {apt.patient.lastName}
                      </p>
                      <p className="mt-1 flex text-sm leading-5 text-gray-500">
                        Reason: {apt.reason || 'Follow-up'}
                      </p>
                    </div>
                  </div>
                  <div className="flex shrink-0 items-center gap-x-6">
                    <div className="hidden sm:flex sm:flex-col sm:items-end">
                      <p className="text-sm leading-6 text-gray-900 flex items-center gap-1 font-medium">
                        <Clock className="h-4 w-4 text-blue-600" />
                        {new Date(apt.appointmentDate).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' })}
                      </p>
                      <span className={`mt-1 inline-flex items-center rounded-md px-2 py-1 text-xs font-medium ring-1 ring-inset ${
                        apt.status === 'Completed' ? 'bg-green-50 text-green-700 ring-green-600/20' : 
                        apt.status === 'Scheduled' ? 'bg-blue-50 text-blue-700 ring-blue-600/20' : 'bg-gray-50 text-gray-600 ring-gray-500/10'
                      }`}>
                        {apt.status}
                      </span>
                    </div>
                    <Link href={`/patients/${apt.patient.id}`} className="rounded-md bg-white px-3 py-2 text-sm font-semibold text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 hover:bg-gray-50">
                      View Chart
                    </Link>
                  </div>
                </li>
              ))
            )}
          </ul>
        </div>
      )}
    </>
  );
}
