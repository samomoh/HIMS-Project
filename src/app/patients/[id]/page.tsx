import { db } from '@/db';
import { patientTriage, users, vitals } from '@/db/schema';
import { desc, eq } from 'drizzle-orm';
import { notFound } from 'next/navigation';
import { Calendar, FileText, Pill, Activity, ArrowLeft, Check } from 'lucide-react';
import Link from 'next/link';
import { currentUser } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export default async function PatientDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params;
  const patientId = parseInt(id, 10);
  
  if (isNaN(patientId)) {
    notFound();
  }

  const [patient, actor] = await Promise.all([
    db.query.patients.findFirst({
      where: (patients, { eq }) => eq(patients.id, patientId),
      with: {
      appointments: {
        with: { doctor: true },
        orderBy: (appointments, { desc }) => [desc(appointments.appointmentDate)],
        limit: 5,
      },
      medicalRecords: {
        with: { doctor: true },
        orderBy: (records, { desc }) => [desc(records.recordDate)],
      },
      prescriptions: {
        with: { doctor: true },
        orderBy: (prescriptions, { desc }) => [desc(prescriptions.prescribedDate)],
      },
      labResults: {
        orderBy: (labs, { desc }) => [desc(labs.dateRequested)],
      },
      imagingResults: {
        orderBy: (imaging, { desc }) => [desc(imaging.dateRequested)],
      },
      }
    }),
    currentUser(),
  ]);

  if (!patient) {
    notFound();
  }

  const recentTriages = await db
    .select({
      id: patientTriage.id,
      triageLevel: patientTriage.triageLevel,
      painScore: patientTriage.painScore,
      chiefComplaint: patientTriage.chiefComplaint,
      notes: patientTriage.notes,
      recordedAt: patientTriage.recordedAt,
      vitals: {
        bloodPressure: vitals.bloodPressure,
        heartRate: vitals.heartRate,
        temperature: vitals.temperature,
        respiratoryRate: vitals.respiratoryRate,
        oxygenSaturation: vitals.oxygenSaturation,
        weight: vitals.weight,
        height: vitals.height,
      },
      staff: { name: users.name },
    })
    .from(patientTriage)
    .innerJoin(vitals, eq(patientTriage.vitalsId, vitals.id))
    .innerJoin(users, eq(patientTriage.staffId, users.id))
    .where(eq(patientTriage.patientId, patientId))
    .orderBy(desc(patientTriage.recordedAt))
    .limit(5);

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link href="/patients" className="p-2 rounded-full hover:bg-gray-200 text-gray-500">
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <h1 className="text-2xl font-bold leading-6 text-gray-900">
          Patient Profile
        </h1>
      </div>

      <div className="overflow-hidden bg-white shadow-sm ring-1 ring-gray-200 sm:rounded-lg">
        <div className="px-4 py-6 sm:px-6 flex items-center justify-between border-b border-gray-100">
          <div className="flex items-center gap-4">
            <div className="h-16 w-16 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-600 text-2xl font-bold">
              {patient.firstName[0]}{patient.lastName[0]}
            </div>
            <div>
              <h3 className="text-xl font-semibold leading-7 text-gray-900">{patient.firstName} {patient.lastName}</h3>
              <p className="max-w-2xl text-sm leading-6 text-gray-500">Patient ID: {patient.id}</p>
              <p className="mt-1 text-sm text-gray-600">Intake category: <span className="font-medium text-gray-900">{patient.patientCategory}</span></p>
            </div>
          </div>
          <div className="flex flex-wrap justify-end gap-2">
            <Link href={`/patients/${patientId}/triage`} className="px-3 py-2 text-sm font-semibold text-white bg-blue-700 rounded-md shadow-sm hover:bg-blue-600 flex items-center gap-2">
              <Activity className="h-4 w-4" />
              Record Triage
            </Link>
            {actor && ['super_admin', 'admin'].includes(actor.role) && (
              <Link href={`/patients/${patientId}/edit`} className="px-3 py-2 text-sm font-semibold text-gray-900 bg-white border border-gray-300 rounded-md shadow-sm hover:bg-gray-50">Edit Details</Link>
            )}
            <Link href={`/patients/${patientId}/clinical-review`} className="px-3 py-2 text-sm font-semibold text-white bg-indigo-600 rounded-md shadow-sm hover:bg-indigo-500 flex items-center gap-2">
              <Activity className="h-4 w-4" />
              Clinical Review
            </Link>
            <Link href={`/patients/${patientId}/review-results`} className="px-3 py-2 text-sm font-semibold text-white bg-green-600 rounded-md shadow-sm hover:bg-green-500 flex items-center gap-2">
              <Check className="h-4 w-4" />
              Review Results & Decisions
            </Link>
            <button className="px-3 py-2 text-sm font-semibold text-gray-900 bg-white border border-gray-300 rounded-md shadow-sm hover:bg-gray-50">
              Schedule Appointment
            </button>
          </div>
        </div>
        <div className="border-t border-gray-100">
          <dl className="divide-y divide-gray-100">
            <div className="px-4 py-4 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
              <dt className="text-sm font-medium text-gray-900">Full name</dt>
              <dd className="mt-1 text-sm leading-6 text-gray-700 sm:col-span-2 sm:mt-0">{patient.firstName} {patient.lastName}</dd>
            </div>
            <div className="px-4 py-4 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
              <dt className="text-sm font-medium text-gray-900">Date of Birth & Gender</dt>
              <dd className="mt-1 text-sm leading-6 text-gray-700 sm:col-span-2 sm:mt-0">
                {new Date(patient.dob).toLocaleDateString()} ({patient.gender})
              </dd>
            </div>
            <div className="px-4 py-4 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
              <dt className="text-sm font-medium text-gray-900">Contact</dt>
              <dd className="mt-1 text-sm leading-6 text-gray-700 sm:col-span-2 sm:mt-0">{patient.contact}</dd>
            </div>
            <div className="px-4 py-4 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
              <dt className="text-sm font-medium text-gray-900">Address</dt>
              <dd className="mt-1 text-sm leading-6 text-gray-700 sm:col-span-2 sm:mt-0">{patient.address || 'N/A'}</dd>
            </div>
            <div className="px-4 py-4 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
              <dt className="text-sm font-medium text-gray-900">Blood Group</dt>
              <dd className="mt-1 text-sm leading-6 text-gray-700 sm:col-span-2 sm:mt-0">{patient.bloodGroup || 'N/A'}</dd>
            </div>
          </dl>
        </div>
      </div>

      <section className="overflow-hidden rounded-xl bg-white shadow-sm ring-1 ring-gray-200" aria-labelledby="triage-history-heading">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-gray-200 bg-gray-50 px-5 py-4">
          <div>
            <h2 id="triage-history-heading" className="text-lg font-semibold text-gray-900">Triage & vital signs</h2>
            <p className="mt-1 text-sm text-gray-600">Initial assessment and observations recorded by clinical staff.</p>
          </div>
          <Link href={`/patients/${patientId}/triage`} className="text-sm font-semibold text-blue-700 hover:text-blue-600">Add assessment</Link>
        </div>
        {recentTriages.length === 0 ? (
          <div className="p-5 text-sm text-gray-600">No triage has been recorded yet. Continue to triage to capture the presenting concern and initial vital signs.</div>
        ) : (
          <ol className="divide-y divide-gray-100">
            {recentTriages.map((triage) => (
              <li key={triage.id} className="space-y-3 p-5">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${triage.triageLevel === 'Resuscitation' || triage.triageLevel === 'Emergent' ? 'bg-red-100 text-red-800' : triage.triageLevel === 'Urgent' ? 'bg-amber-100 text-amber-800' : 'bg-green-100 text-green-800'}`}>{triage.triageLevel}</span>
                    <span className="text-sm font-medium text-gray-900">Pain {triage.painScore}/10</span>
                  </div>
                  <time className="text-xs text-gray-500">{new Date(triage.recordedAt).toLocaleString()}</time>
                </div>
                <p className="text-sm text-gray-800"><span className="font-medium">Presenting concern:</span> {triage.chiefComplaint}</p>
                <p className="text-sm text-gray-700">BP {triage.vitals.bloodPressure || '—'} · HR {triage.vitals.heartRate ?? '—'} bpm · Temp {triage.vitals.temperature ?? '—'}°C · RR {triage.vitals.respiratoryRate ?? '—'}/min · SpO₂ {triage.vitals.oxygenSaturation ?? '—'}%{triage.vitals.weight ? ` · Weight ${triage.vitals.weight} kg` : ''}{triage.vitals.height ? ` · Height ${triage.vitals.height} cm` : ''}</p>
                {triage.notes && <p className="text-sm text-gray-600">{triage.notes}</p>}
                <p className="text-xs text-gray-500">Recorded by {triage.staff.name}</p>
              </li>
            ))}
          </ol>
        )}
      </section>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Medical Records */}
        <div className="bg-white shadow-sm ring-1 ring-gray-200 rounded-xl overflow-hidden">
          <div className="p-4 border-b border-gray-200 bg-gray-50 flex items-center gap-2">
            <FileText className="h-5 w-5 text-gray-500" />
            <h2 className="text-lg font-medium text-gray-900">Medical Records</h2>
          </div>
          <ul className="divide-y divide-gray-100 p-4 space-y-4">
            {patient.medicalRecords.length === 0 ? (
              <p className="text-sm text-gray-500">No medical records found.</p>
            ) : (
              patient.medicalRecords.map((record) => (
                <li key={record.id} className="pt-4 first:pt-0">
                  <div className="flex justify-between">
                    <p className="text-sm font-semibold text-gray-900">Diagnosis: {record.diagnosis}</p>
                    <p className="text-xs text-gray-500">{new Date(record.recordDate).toLocaleDateString()}</p>
                  </div>
                  {record.consultation && <p className="mt-1 text-sm text-gray-700"><span className="font-medium">Consultation:</span> {record.consultation}</p>}
                  {record.physicalExamination && <p className="mt-1 text-sm text-gray-700"><span className="font-medium">Physical Exam:</span> {record.physicalExamination}</p>}
                  {record.treatment && <p className="mt-1 text-sm text-gray-700"><span className="font-medium">Treatment:</span> {record.treatment}</p>}
                  
                  {record.decisionType && (
                    <div className="mt-3 p-3 bg-blue-50 border border-blue-100 rounded-md">
                      <p className="text-sm font-semibold text-blue-900 mb-1">Decision: {record.decisionType}</p>
                      {record.referralNote && <p className="text-sm text-blue-800"><span className="font-medium">Referral Details:</span> {record.referralNote}</p>}
                      {record.procedureNote && <p className="text-sm text-blue-800"><span className="font-medium">Procedure/Surgery:</span> {record.procedureNote}</p>}
                      {record.wardAdmission && <p className="text-sm text-blue-800"><span className="font-medium">Ward/Admission:</span> {record.wardAdmission}</p>}
                    </div>
                  )}

                  {record.notes && <p className="mt-1 text-sm text-gray-500 italic mt-2 bg-gray-50 p-2 rounded">&quot;{record.notes}&quot;</p>}
                  <p className="mt-2 text-xs text-blue-600">Attending: Dr. {record.doctor.name}</p>
                </li>
              ))
            )}
          </ul>
        </div>

        {/* Prescriptions */}
        <div className="bg-white shadow-sm ring-1 ring-gray-200 rounded-xl overflow-hidden">
          <div className="p-4 border-b border-gray-200 bg-gray-50 flex items-center gap-2">
            <Pill className="h-5 w-5 text-gray-500" />
            <h2 className="text-lg font-medium text-gray-900">Prescriptions</h2>
          </div>
          <ul className="divide-y divide-gray-100 p-4 space-y-4">
            {patient.prescriptions.length === 0 ? (
              <p className="text-sm text-gray-500">No prescriptions found.</p>
            ) : (
              patient.prescriptions.map((prescription) => (
                <li key={prescription.id} className="pt-4 first:pt-0">
                  <div className="flex justify-between">
                    <p className="text-sm font-semibold text-gray-900">{prescription.medication}</p>
                    <p className="text-xs text-gray-500">{new Date(prescription.prescribedDate).toLocaleDateString()}</p>
                  </div>
                  <p className="mt-1 text-sm text-gray-600"><span className="font-medium">Dosage:</span> {prescription.dosage}</p>
                  {prescription.instructions && <p className="mt-1 text-sm text-gray-500">{prescription.instructions}</p>}
                  <p className="mt-2 text-xs text-blue-600">Prescribed by Dr. {prescription.doctor.name}</p>
                </li>
              ))
            )}
          </ul>
        </div>

        {/* Lab Results */}
        <div className="bg-white shadow-sm ring-1 ring-gray-200 rounded-xl overflow-hidden">
          <div className="p-4 border-b border-gray-200 bg-gray-50 flex items-center gap-2">
            <Activity className="h-5 w-5 text-gray-500" />
            <h2 className="text-lg font-medium text-gray-900">Lab Results</h2>
          </div>
          <ul className="divide-y divide-gray-100 p-4 space-y-4">
            {patient.labResults.length === 0 ? (
              <p className="text-sm text-gray-500">No lab results found.</p>
            ) : (
              patient.labResults.map((lab) => (
                <li key={lab.id} className="pt-4 first:pt-0">
                  <div className="flex justify-between items-center">
                    <p className="text-sm font-semibold text-gray-900">{lab.testName}</p>
                    <span className={`inline-flex items-center rounded-md px-2 py-1 text-xs font-medium ring-1 ring-inset ${
                      lab.status === 'Completed' ? 'bg-green-50 text-green-700 ring-green-600/20' : 'bg-yellow-50 text-yellow-800 ring-yellow-600/20'
                    }`}>
                      {lab.status}
                    </span>
                  </div>
                  {lab.result && <p className="mt-2 text-sm text-gray-700 font-mono bg-gray-50 p-2 rounded">{lab.result}</p>}
                  {lab.testName.startsWith('[EXTERNAL] ') && lab.reportUrl?.startsWith('/api/emergency/external-lab-file?') && <a href={lab.reportUrl} target="_blank" rel="noopener noreferrer" className="mt-2 inline-flex text-sm font-medium text-blue-700 hover:underline">Open attached lab report</a>}
                  <p className="mt-2 text-xs text-gray-500">{lab.testName.startsWith('[EXTERNAL] ') && lab.dateCompleted ? 'Report date' : 'Requested'}: {new Date(lab.testName.startsWith('[EXTERNAL] ') && lab.dateCompleted ? lab.dateCompleted : lab.dateRequested).toLocaleDateString()}</p>
                </li>
              ))
            )}
          </ul>
        </div>

        {/* Imaging Results */}
        <div className="bg-white shadow-sm ring-1 ring-gray-200 rounded-xl overflow-hidden">
          <div className="p-4 border-b border-gray-200 bg-gray-50 flex items-center gap-2">
            <Activity className="h-5 w-5 text-gray-500" />
            <h2 className="text-lg font-medium text-gray-900">Imaging & Radiology</h2>
          </div>
          <ul className="divide-y divide-gray-100 p-4 space-y-4">
            {patient.imagingResults?.length === 0 ? (
              <p className="text-sm text-gray-500">No imaging results found.</p>
            ) : (
              patient.imagingResults?.map((img: any) => (
                <li key={img.id} className="pt-4 first:pt-0">
                  <div className="flex justify-between items-center">
                    <p className="text-sm font-semibold text-gray-900">{img.procedureName}</p>
                    <span className={`inline-flex items-center rounded-md px-2 py-1 text-xs font-medium ring-1 ring-inset ${
                      img.status === 'Completed' ? 'bg-green-50 text-green-700 ring-green-600/20' : 
                      img.status === 'Scheduled' ? 'bg-blue-50 text-blue-700 ring-blue-600/20' : 'bg-yellow-50 text-yellow-800 ring-yellow-600/20'
                    }`}>
                      {img.status}
                    </span>
                  </div>
                  {img.status === 'Scheduled' && img.scheduledDate && (
                    <p className="mt-2 text-sm text-blue-600 font-medium">Scheduled for: {new Date(img.scheduledDate).toLocaleString()}</p>
                  )}
                  {img.resultText && <p className="mt-2 text-sm text-gray-700 font-mono bg-gray-50 p-2 rounded">{img.resultText}</p>}
                  {img.reportUrl && (
                    <a href={img.reportUrl} target="_blank" rel="noopener noreferrer" className="mt-2 inline-block text-sm text-blue-600 hover:underline">
                      View Imaging Report
                    </a>
                  )}
                  <p className="mt-2 text-xs text-gray-500">Requested: {new Date(img.dateRequested).toLocaleDateString()}</p>
                </li>
              ))
            )}
          </ul>
        </div>

        {/* Appointments */}
        <div className="bg-white shadow-sm ring-1 ring-gray-200 rounded-xl overflow-hidden">
          <div className="p-4 border-b border-gray-200 bg-gray-50 flex items-center gap-2">
            <Calendar className="h-5 w-5 text-gray-500" />
            <h2 className="text-lg font-medium text-gray-900">Recent Appointments</h2>
          </div>
          <ul className="divide-y divide-gray-100 p-4 space-y-4">
            {patient.appointments.length === 0 ? (
              <p className="text-sm text-gray-500">No appointments found.</p>
            ) : (
              patient.appointments.map((apt) => (
                <li key={apt.id} className="pt-4 first:pt-0">
                  <div className="flex justify-between">
                    <p className="text-sm font-semibold text-gray-900">{new Date(apt.appointmentDate).toLocaleString()}</p>
                    <span className={`inline-flex items-center rounded-md px-2 py-1 text-xs font-medium ring-1 ring-inset ${
                      apt.status === 'Completed' ? 'bg-green-50 text-green-700 ring-green-600/20' : 
                      apt.status === 'Scheduled' ? 'bg-blue-50 text-blue-700 ring-blue-600/20' : 'bg-gray-50 text-gray-600 ring-gray-500/10'
                    }`}>
                      {apt.status}
                    </span>
                  </div>
                  <p className="mt-1 text-sm text-gray-600"><span className="font-medium">Reason:</span> {apt.reason}</p>
                  <p className="mt-1 text-xs text-blue-600">Dr. {apt.doctor.name}</p>
                </li>
              ))
            )}
          </ul>
        </div>
      </div>
    </div>
  );
}
