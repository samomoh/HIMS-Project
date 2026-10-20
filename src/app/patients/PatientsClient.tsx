'use client';

import { useRef, useState } from 'react';
import { Download, Upload, Plus, FileSpreadsheet, Search, UserCircle, Trash2 } from 'lucide-react';
import Link from 'next/link';
import { deletePatientAction } from './actions';
import ConfirmDialog from '@/components/feedback/ConfirmDialog';
import ToastNotice from '@/components/feedback/ToastNotice';
import RecordViewToggle from '@/components/feedback/RecordViewToggle';

type Patient = {
  id: number;
  firstName: string;
  lastName: string;
  dob: string;
  gender: string;
  contact: string;
  patientCategory: string;
  bloodGroup: string | null;
  createdAt: Date;
};

export default function PatientsClient({ 
  initialPatients,
  query,
  canDelete,
}: { 
  initialPatients: Patient[],
  query?: string,
  canDelete: boolean,
}) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [patientsList, setPatientsList] = useState(initialPatients);
  const [viewMode, setViewMode] = useState<'list' | 'tile'>('list');
  const [patientToDelete, setPatientToDelete] = useState<Patient | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [toast, setToast] = useState({ message: '', tone: 'success' as 'success' | 'error' });
  const fileInputRef = useRef<HTMLInputElement>(null);

  const confirmDelete = async () => {
    if (!patientToDelete) return;
    setIsDeleting(true);
    try {
      const result = await deletePatientAction(patientToDelete.id);
      if (!result.success) {
        setToast({ message: result.message, tone: 'error' });
        return;
      }
      setPatientsList((current) => current.filter((item) => item.id !== patientToDelete.id));
      setToast({ message: `${patientToDelete.firstName} ${patientToDelete.lastName}'s patient record was deleted.`, tone: 'success' });
      setPatientToDelete(null);
    } catch (error) {
      console.error(error);
      setToast({ message: error instanceof Error ? error.message : 'Unable to delete this patient record.', tone: 'error' });
    } finally {
      setIsDeleting(false);
    }
  };

  const downloadTemplate = () => {
    const csvContent = "firstName,lastName,dob,gender,contact,address,bloodGroup,emergencyContact\nJohn,Doe,1990-01-01,Male,+1234567890,123 Main St,O+,+0987654321\nJane,Smith,1985-05-15,Female,+1987654321,456 Oak St,A-,+1122334455";
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'patient_template.csv';
    a.click();
    window.URL.revokeObjectURL(url);
  };

  const exportData = () => {
    const header = "id,firstName,lastName,dob,gender,contact,patientCategory,bloodGroup,createdAt\n";
    const rows = patientsList.map(p =>
      `${p.id},"${p.firstName}","${p.lastName}","${p.dob}","${p.gender}","${p.contact}","${p.patientCategory}","${p.bloodGroup || ''}","${new Date(p.createdAt).toISOString()}"`
    ).join("\n");
    
    const blob = new Blob([header + rows], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'patients_export.csv';
    a.click();
    window.URL.revokeObjectURL(url);
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsSubmitting(true);
    const reader = new FileReader();
    reader.onload = async (event) => {
      const text = event.target?.result as string;
      const lines = text.split('\n').filter(l => l.trim().length > 0);
      if (lines.length < 2) {
        alert('Invalid CSV format or empty file.');
        setIsSubmitting(false);
        return;
      }

      const headers = lines[0].toLowerCase().split(',').map(h => h.trim());
      const fNameIdx = headers.indexOf('firstname');
      const lNameIdx = headers.indexOf('lastname');
      const dobIdx = headers.indexOf('dob');
      const genderIdx = headers.indexOf('gender');
      const contactIdx = headers.indexOf('contact');
      
      const addressIdx = headers.indexOf('address');
      const bloodGroupIdx = headers.indexOf('bloodgroup');
      const emergencyIdx = headers.indexOf('emergencycontact');

      if (fNameIdx === -1 || lNameIdx === -1 || dobIdx === -1 || genderIdx === -1 || contactIdx === -1) {
        alert('CSV must contain "firstName", "lastName", "dob", "gender", and "contact" columns.');
        setIsSubmitting(false);
        return;
      }

      const patientList = [];
      for (let i = 1; i < lines.length; i++) {
        // Basic CSV splitting that respects quotes
        const match = lines[i].match(/(".*?"|[^",\s]+)(?=\s*,|\s*$)/g);
        if (!match) continue;
        const cols = match.map(c => c.replace(/^"|"$/g, '').trim());
        
        if (cols.length >= 5) {
          patientList.push({
            firstName: cols[fNameIdx],
            lastName: cols[lNameIdx],
            dob: cols[dobIdx],
            gender: cols[genderIdx],
            contact: cols[contactIdx],
            address: addressIdx !== -1 ? cols[addressIdx] : null,
            bloodGroup: bloodGroupIdx !== -1 ? cols[bloodGroupIdx] : null,
            emergencyContact: emergencyIdx !== -1 ? cols[emergencyIdx] : null,
          });
        }
      }

      if (patientList.length > 0) {
        try {
          const response = await fetch('/api/patients/batch', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ patients: patientList })
          });
          
          if (response.ok) {
            window.location.reload();
          } else {
            alert('Failed to upload some patients. Check logs.');
          }
        } catch (err) {
          console.error(err);
          alert('Batch upload error.');
        }
      }
      setIsSubmitting(false);
    };
    reader.readAsText(file);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  return (
    <div className="space-y-6">
      <div className="sm:flex sm:items-center">
        <div className="sm:flex-auto">
          <h1 className="text-2xl font-bold leading-6 text-gray-900">Patients</h1>
          <p className="mt-2 text-sm text-gray-700">
            A list of all patients in the hospital including their name, contact, and blood group.
          </p>
        </div>
        <div className="mt-4 sm:ml-16 sm:mt-0 sm:flex-none flex flex-wrap gap-2 justify-end">
          <Link
            href="/patients/new"
            className="flex items-center rounded-md bg-blue-600 px-3 py-2 text-center text-sm font-semibold text-white shadow-sm hover:bg-blue-500"
          >
            <Plus className="h-4 w-4 mr-1" />
            Add Patient
          </Link>
          <button 
            onClick={() => fileInputRef.current?.click()} 
            disabled={isSubmitting}
            className="flex items-center rounded-md bg-white px-3 py-2 text-sm font-semibold text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 hover:bg-gray-50 disabled:opacity-50"
          >
            <Upload className="h-4 w-4 mr-2" /> {isSubmitting ? 'Uploading...' : 'Batch Upload'}
          </button>
          <input type="file" accept=".csv" ref={fileInputRef} className="hidden" onChange={handleFileUpload} />
          
          <button onClick={downloadTemplate} className="flex items-center rounded-md bg-white px-3 py-2 text-sm font-semibold text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 hover:bg-gray-50">
            <FileSpreadsheet className="h-4 w-4 mr-2" /> Template
          </button>
          <button onClick={exportData} className="flex items-center rounded-md bg-white px-3 py-2 text-sm font-semibold text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 hover:bg-gray-50">
            <Download className="h-4 w-4 mr-2" /> Export
          </button>
        </div>
      </div>

      <div className="flex flex-wrap justify-between items-center gap-4 bg-white p-4 rounded-xl shadow-sm ring-1 ring-gray-200">
        <form className="relative w-full max-w-md flex" action="/patients" method="GET">
          <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
            <Search className="h-5 w-5 text-gray-400" aria-hidden="true" />
          </div>
          <input
            type="text"
            name="q"
            defaultValue={query}
            className="block w-full rounded-md border-0 py-1.5 pl-10 text-gray-900 ring-1 ring-inset ring-gray-300 placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-blue-600 sm:text-sm sm:leading-6"
            placeholder="Search patients..."
          />
          <button type="submit" className="ml-2 rounded-md bg-white px-2.5 py-1.5 text-sm font-semibold text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 hover:bg-gray-50">
            Search
          </button>
        </form>
        <RecordViewToggle value={viewMode} onChange={setViewMode} />
      </div>

      <div className={`${viewMode === 'list' ? '' : 'hidden'} mt-8 flow-root`}>
        <div className="-mx-4 -my-2 overflow-x-auto sm:-mx-6 lg:-mx-8">
          <div className="inline-block min-w-full py-2 align-middle sm:px-6 lg:px-8">
            <div className="overflow-hidden shadow ring-1 ring-black ring-opacity-5 sm:rounded-lg">
              <table className="min-w-full divide-y divide-gray-300">
                <thead className="bg-gray-50">
                  <tr>
                    <th scope="col" className="py-3.5 pl-4 pr-3 text-left text-sm font-semibold text-gray-900 sm:pl-6">Name</th>
                    <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">Gender & DOB</th>
                    <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">Contact</th>
                    <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">Intake category</th>
                    <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">Blood Group</th>
                    <th scope="col" className="relative py-3.5 pl-3 pr-4 sm:pr-6">
                      <span className="sr-only">Actions</span>
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 bg-white">
          {patientsList.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="py-10 text-center text-sm text-gray-500">
                        <UserCircle className="mx-auto h-12 w-12 text-gray-300" />
                        <h3 className="mt-2 text-sm font-semibold text-gray-900">No patients found</h3>
                        <p className="mt-1 text-sm text-gray-500">Get started by creating a new patient.</p>
                      </td>
                    </tr>
                  ) : (
                    patientsList.map((patient) => (
                      <tr key={patient.id} className="hover:bg-gray-50">
                        <td className="whitespace-nowrap py-4 pl-4 pr-3 text-sm sm:pl-6">
                          <div className="flex items-center">
                            <div className="h-10 w-10 flex-shrink-0 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-600 font-semibold">
                              {patient.firstName[0]}{patient.lastName[0]}
                            </div>
                            <div className="ml-4">
                              <div className="font-medium text-gray-900">{patient.firstName} {patient.lastName}</div>
                              <div className="text-gray-500">ID: {patient.id}</div>
                            </div>
                          </div>
                        </td>
                        <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">
                          <div className="text-gray-900">{patient.gender}</div>
                          <div className="text-gray-500">{new Date(patient.dob).toLocaleDateString()}</div>
                        </td>
                        <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">
                          {patient.contact}
                        </td>
                        <td className="whitespace-nowrap px-3 py-4 text-sm">
                          <span className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium ${patient.patientCategory === 'Emergency' ? 'bg-red-50 text-red-700' : patient.patientCategory === 'Referred In' ? 'bg-violet-50 text-violet-700' : 'bg-blue-50 text-blue-700'}`}>
                            {patient.patientCategory}
                          </span>
                        </td>
                        <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">
                          <span className="inline-flex items-center rounded-md bg-red-50 px-2 py-1 text-xs font-medium text-red-700 ring-1 ring-inset ring-red-600/10">
                            {patient.bloodGroup || 'N/A'}
                          </span>
                        </td>
                        <td className="relative whitespace-nowrap py-4 pl-3 pr-4 text-right text-sm font-medium sm:pr-6">
                          <a href={`/patients/${patient.id}`} aria-label={`View patient ${patient.firstName} ${patient.lastName}`} className="inline-flex items-center rounded-md bg-blue-600 px-3 py-1.5 text-sm font-semibold text-white shadow-sm hover:bg-blue-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600">
                            View <span className="sr-only">, {patient.firstName}</span>
                          </a>
                          {canDelete && <button type="button" aria-label={`Delete ${patient.firstName} ${patient.lastName}`} onClick={() => setPatientToDelete(patient)} className="ml-3 inline-flex items-center text-red-600 hover:text-red-800">
                            <Trash2 className="h-4 w-4" />
                          </button>}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
      {viewMode === 'tile' && (patientsList.length === 0 ? (
        <div className="rounded-xl bg-white px-6 py-12 text-center shadow-sm ring-1 ring-gray-200">
          <UserCircle className="mx-auto h-12 w-12 text-gray-300" />
          <h2 className="mt-3 text-sm font-semibold text-gray-900">No patients found</h2>
          <p className="mt-1 text-sm text-gray-500">Try a different search or add a patient record.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {patientsList.map((patient) => (
            <article key={patient.id} className="overflow-hidden rounded-xl bg-white shadow-sm ring-1 ring-gray-200 transition-shadow hover:shadow-md">
              <div className={`h-1.5 ${patient.patientCategory === 'Emergency' ? 'bg-red-500' : patient.patientCategory === 'Referred In' ? 'bg-violet-500' : 'bg-blue-600'}`} />
              <div className="p-5">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex min-w-0 items-center gap-3">
                    <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-indigo-100 text-sm font-bold text-indigo-700">{patient.firstName[0]}{patient.lastName[0]}</span>
                    <div className="min-w-0"><h2 className="truncate font-semibold text-gray-900">{patient.firstName} {patient.lastName}</h2><p className="text-xs text-gray-500">Patient ID {patient.id}</p></div>
                  </div>
                  <span className={`shrink-0 rounded-full px-2.5 py-1 text-xs font-medium ${patient.patientCategory === 'Emergency' ? 'bg-red-50 text-red-700' : patient.patientCategory === 'Referred In' ? 'bg-violet-50 text-violet-700' : 'bg-blue-50 text-blue-700'}`}>{patient.patientCategory}</span>
                </div>
                <dl className="mt-5 grid grid-cols-2 gap-x-4 gap-y-3 border-t border-gray-100 pt-4 text-sm">
                  <div><dt className="text-xs text-gray-500">Gender · Date of birth</dt><dd className="mt-1 font-medium text-gray-800">{patient.gender} · {new Date(patient.dob).toLocaleDateString()}</dd></div>
                  <div><dt className="text-xs text-gray-500">Blood group</dt><dd className="mt-1 font-medium text-gray-800">{patient.bloodGroup || 'Not recorded'}</dd></div>
                  <div className="col-span-2"><dt className="text-xs text-gray-500">Contact</dt><dd className="mt-1 font-medium text-gray-800">{patient.contact || 'Not recorded'}</dd></div>
                </dl>
                <div className="mt-5 flex items-center justify-between border-t border-gray-100 pt-4">
                    <a href={`/patients/${patient.id}`} aria-label={`View patient ${patient.firstName} ${patient.lastName}`} className="inline-flex items-center rounded-md bg-blue-600 px-3 py-1.5 text-sm font-semibold text-white shadow-sm hover:bg-blue-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600">View patient</a>
                  {canDelete && <button type="button" onClick={() => setPatientToDelete(patient)} className="inline-flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-sm font-medium text-red-700 hover:bg-red-50"><Trash2 className="h-4 w-4" />Delete</button>}
                </div>
              </div>
            </article>
          ))}
        </div>
      ))}
      <ConfirmDialog
        open={Boolean(patientToDelete)}
        title="Delete patient record?"
        message={patientToDelete ? `Delete ${patientToDelete.firstName} ${patientToDelete.lastName}'s record? This cannot be undone. Records with a linked account or clinical history are protected.` : ''}
        confirmLabel="Delete patient"
        tone="danger"
        busy={isDeleting}
        onCancel={() => setPatientToDelete(null)}
        onConfirm={confirmDelete}
      />
      <ToastNotice message={toast.message} tone={toast.tone} onDismiss={() => setToast({ message: '', tone: toast.tone })} />
    </div>
  );
}
