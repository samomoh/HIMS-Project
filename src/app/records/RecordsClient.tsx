'use client';

import { useState } from 'react';
import { FolderArchive, Search, FileText, CheckCircle, AlertTriangle, ShieldAlert, History, Activity, Microscope, Pill, X } from 'lucide-react';
import Link from 'next/link';
import { submitAuditAction, updateAuditStatusAction } from './actions';

type Patient = any;
type Audit = any;
type Officer = any;

export default function RecordsClient({ 
  patients,
  audits,
  officers
}: { 
  patients: Patient[],
  audits: Audit[],
  officers: Officer[]
}) {
  const [activeTab, setActiveTab] = useState<'Master File' | 'Audits'>('Master File');
  const [searchQuery, setSearchQuery] = useState('');
  
  const [auditModalOpen, setAuditModalOpen] = useState(false);
  const [selectedRecord, setSelectedRecord] = useState<any>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const [auditData, setAuditData] = useState({
    officerId: officers.length > 0 ? officers[0].id : 0,
    status: 'Verified',
    flagReason: '',
  });

  const filteredPatients = patients.filter((p: any) => 
    p.firstName.toLowerCase().includes(searchQuery.toLowerCase()) || 
    p.lastName.toLowerCase().includes(searchQuery.toLowerCase()) ||
    p.id.toString() === searchQuery
  );

  const getAuditStatus = (type: string, id: number) => {
    const audit = audits.find((a: any) => a.recordType === type && a.recordId === id);
    return audit;
  };

  const openAuditModal = (recordType: string, record: any, patientId: number) => {
    const existingAudit = getAuditStatus(recordType, record.id);
    setSelectedRecord({ ...record, recordType, patientId, existingAuditId: existingAudit?.id });
    setAuditData({
      officerId: officers.length > 0 ? officers[0].id : 0,
      status: existingAudit ? existingAudit.status : 'Verified',
      flagReason: existingAudit ? (existingAudit.flagReason || '') : '',
    });
    setAuditModalOpen(true);
  };

  const handleAuditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedRecord) return;

    setIsSubmitting(true);
    try {
      if (selectedRecord.existingAuditId) {
        await updateAuditStatusAction(selectedRecord.existingAuditId, auditData.status, auditData.flagReason);
      } else {
        await submitAuditAction({
          recordType: selectedRecord.recordType,
          recordId: selectedRecord.id,
          patientId: selectedRecord.patientId,
          officerId: auditData.officerId,
          status: auditData.status,
          flagReason: auditData.flagReason,
        });
      }
      window.location.reload();
    } catch (err) {
      console.error(err);
      alert('Failed to save audit.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const renderAuditBadge = (type: string, id: number) => {
    const audit = getAuditStatus(type, id);
    if (!audit) return <span className="inline-flex items-center rounded-md bg-gray-100 px-2 py-0.5 text-[10px] font-medium text-gray-600">Pending Review</span>;
    if (audit.status === 'Verified') return <span className="inline-flex items-center rounded-md bg-green-50 px-2 py-0.5 text-[10px] font-medium text-green-700 ring-1 ring-inset ring-green-600/20"><CheckCircle className="w-3 h-3 mr-1"/> Verified</span>;
    return <span className="inline-flex items-center rounded-md bg-red-50 px-2 py-0.5 text-[10px] font-medium text-red-700 ring-1 ring-inset ring-red-600/10"><AlertTriangle className="w-3 h-3 mr-1"/> Flagged</span>;
  };

  return (
    <>
      <div className="flex border-b border-gray-200 mb-6 space-x-2">
        <button
          onClick={() => setActiveTab('Master File')}
          className={`px-4 py-2 border-b-2 text-sm font-medium transition-colors flex items-center ${activeTab === 'Master File' ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}
        >
          <FolderArchive className="w-4 h-4 mr-2" /> Master Patient Index (MPI)
        </button>
        <button
          onClick={() => setActiveTab('Audits')}
          className={`px-4 py-2 border-b-2 text-sm font-medium transition-colors flex items-center ${activeTab === 'Audits' ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}
        >
          <ShieldAlert className="w-4 h-4 mr-2" /> Quality & Compliance Audits
        </button>
      </div>

      {activeTab === 'Master File' && (
        <div className="space-y-6">
          <div className="relative max-w-md">
            <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
              <Search className="h-5 w-5 text-gray-400" />
            </div>
            <input
              type="text"
              placeholder="Search MPI by Name or ID..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="block w-full rounded-md border-0 py-2 pl-10 text-gray-900 ring-1 ring-inset ring-gray-300 focus:ring-2 focus:ring-blue-600 sm:text-sm sm:leading-6"
            />
          </div>

          <div className="grid grid-cols-1 gap-6">
            {filteredPatients.map((patient: any) => {
              const pendingCount = 
                patient.medicalRecords.filter((r:any) => !getAuditStatus('ClinicalRecord', r.id)).length +
                patient.labResults.filter((r:any) => !getAuditStatus('LabResult', r.id)).length +
                patient.imagingResults.filter((r:any) => !getAuditStatus('ImagingResult', r.id)).length +
                patient.prescriptions.filter((r:any) => !getAuditStatus('Prescription', r.id)).length;
                
              const flaggedCount = 
                patient.medicalRecords.filter((r:any) => getAuditStatus('ClinicalRecord', r.id)?.status === 'Flagged').length +
                patient.labResults.filter((r:any) => getAuditStatus('LabResult', r.id)?.status === 'Flagged').length +
                patient.imagingResults.filter((r:any) => getAuditStatus('ImagingResult', r.id)?.status === 'Flagged').length +
                patient.prescriptions.filter((r:any) => getAuditStatus('Prescription', r.id)?.status === 'Flagged').length;

              return (
                <div key={patient.id} className="bg-white overflow-hidden shadow-sm rounded-xl ring-1 ring-gray-200">
                  <div className="p-4 border-b border-gray-200 bg-gray-50 flex justify-between items-center">
                    <div className="flex items-center gap-4">
                      <div className="h-10 w-10 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 font-bold text-sm">
                        {patient.firstName[0]}{patient.lastName[0]}
                      </div>
                      <div>
                        <h3 className="text-base font-bold text-gray-900">
                          {patient.firstName} {patient.lastName} <span className="text-gray-400 font-normal ml-2">ID: #{patient.id}</span>
                        </h3>
                        <p className="text-xs text-gray-500">DOB: {new Date(patient.dob).toLocaleDateString()} | Gender: {patient.gender}</p>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <Link href={`/patients/${patient.id}`} className="px-3 py-1.5 text-xs font-semibold text-gray-700 bg-white border border-gray-300 rounded shadow-sm hover:bg-gray-50">
                        View Full EMR
                      </Link>
                    </div>
                  </div>
                  
                  <div className="p-4 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                    {/* Clinical Records */}
                    <div className="border border-gray-100 rounded-lg p-3">
                      <h4 className="text-xs font-bold text-gray-900 uppercase tracking-wider mb-2 flex items-center"><Activity className="w-3 h-3 mr-1"/> Clinical Records ({patient.medicalRecords.length})</h4>
                      <ul className="space-y-2 max-h-40 overflow-y-auto pr-1">
                        {patient.medicalRecords.map((r:any) => (
                          <li key={`cr-${r.id}`} className="text-xs p-2 bg-gray-50 rounded flex justify-between items-center group">
                            <span className="truncate w-32" title={r.diagnosis}>{r.diagnosis}</span>
                            <div className="flex items-center gap-2">
                              {renderAuditBadge('ClinicalRecord', r.id)}
                              <button onClick={() => openAuditModal('ClinicalRecord', r, patient.id)} className="text-blue-600 opacity-0 group-hover:opacity-100 hover:underline">Audit</button>
                            </div>
                          </li>
                        ))}
                      </ul>
                    </div>

                    {/* Lab Results */}
                    <div className="border border-gray-100 rounded-lg p-3">
                      <h4 className="text-xs font-bold text-gray-900 uppercase tracking-wider mb-2 flex items-center"><Microscope className="w-3 h-3 mr-1"/> Lab Results ({patient.labResults.length})</h4>
                      <ul className="space-y-2 max-h-40 overflow-y-auto pr-1">
                        {patient.labResults.map((r:any) => (
                          <li key={`lr-${r.id}`} className="text-xs p-2 bg-gray-50 rounded flex justify-between items-center group">
                            <span className="truncate w-32" title={r.testName}>{r.testName}</span>
                            <div className="flex items-center gap-2">
                              {renderAuditBadge('LabResult', r.id)}
                              <button onClick={() => openAuditModal('LabResult', r, patient.id)} className="text-blue-600 opacity-0 group-hover:opacity-100 hover:underline">Audit</button>
                            </div>
                          </li>
                        ))}
                      </ul>
                    </div>

                    {/* Prescriptions */}
                    <div className="border border-gray-100 rounded-lg p-3">
                      <h4 className="text-xs font-bold text-gray-900 uppercase tracking-wider mb-2 flex items-center"><Pill className="w-3 h-3 mr-1"/> Prescriptions ({patient.prescriptions.length})</h4>
                      <ul className="space-y-2 max-h-40 overflow-y-auto pr-1">
                        {patient.prescriptions.map((r:any) => (
                          <li key={`rx-${r.id}`} className="text-xs p-2 bg-gray-50 rounded flex justify-between items-center group">
                            <span className="truncate w-32" title={r.medication}>{r.medication}</span>
                            <div className="flex items-center gap-2">
                              {renderAuditBadge('Prescription', r.id)}
                              <button onClick={() => openAuditModal('Prescription', r, patient.id)} className="text-blue-600 opacity-0 group-hover:opacity-100 hover:underline">Audit</button>
                            </div>
                          </li>
                        ))}
                      </ul>
                    </div>

                    {/* Audit Summary Box */}
                    <div className="bg-slate-50 border border-slate-200 rounded-lg p-4 flex flex-col justify-center items-center text-center">
                      <ShieldAlert className="h-8 w-8 text-slate-400 mb-2"/>
                      <h4 className="text-sm font-bold text-slate-700">Patient Chart Status</h4>
                      <p className="text-xs text-slate-500 mt-1">{patient.medicalRecords.length + patient.labResults.length + patient.imagingResults.length + patient.prescriptions.length} Total Records</p>
                      
                      <div className="mt-3 w-full flex justify-around text-xs">
                        <div className="text-center">
                          <span className="block font-bold text-gray-700">{pendingCount}</span>
                          <span className="text-gray-500">Unverified</span>
                        </div>
                        <div className="text-center">
                          <span className="block font-bold text-red-600">{flaggedCount}</span>
                          <span className="text-red-600">Flagged</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {activeTab === 'Audits' && (
        <div className="bg-white shadow-sm ring-1 ring-gray-200 rounded-xl overflow-hidden">
          <div className="px-4 py-4 border-b border-gray-200 bg-gray-50 flex items-center">
            <History className="h-5 w-5 text-gray-500 mr-2" />
            <h3 className="text-base font-semibold leading-6 text-gray-900">Recent Audit Log</h3>
          </div>
          <table className="min-w-full divide-y divide-gray-300">
            <thead className="bg-gray-50">
              <tr>
                <th scope="col" className="py-3.5 pl-4 pr-3 text-left text-sm font-semibold text-gray-900">Date</th>
                <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">Record ID/Type</th>
                <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">Patient ID</th>
                <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">Status</th>
                <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">Officer</th>
                <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">Notes</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {audits.length === 0 ? (
                <tr><td colSpan={6} className="py-8 text-center text-sm text-gray-500">No audits recorded.</td></tr>
              ) : (
                audits.map((a: any) => (
                  <tr key={a.id} className="hover:bg-gray-50">
                    <td className="whitespace-nowrap py-3 pl-4 pr-3 text-sm text-gray-500">{new Date(a.auditedAt).toLocaleString()}</td>
                    <td className="whitespace-nowrap px-3 py-3 text-sm font-medium text-gray-900">{a.recordType} #{a.recordId}</td>
                    <td className="whitespace-nowrap px-3 py-3 text-sm text-blue-600 hover:underline"><Link href={`/patients/${a.patientId}`}>PT-{a.patientId}</Link></td>
                    <td className="whitespace-nowrap px-3 py-3 text-sm">
                      {a.status === 'Verified' ? <span className="text-green-600 font-medium">Verified</span> : <span className="text-red-600 font-bold">Flagged</span>}
                    </td>
                    <td className="whitespace-nowrap px-3 py-3 text-sm text-gray-500">HIM #{a.officerId}</td>
                    <td className="px-3 py-3 text-sm text-gray-500 max-w-xs truncate">{a.flagReason || '-'}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* Quality Audit Modal */}
      {auditModalOpen && selectedRecord && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="fixed inset-0 bg-gray-900/60" onClick={() => setAuditModalOpen(false)} />
          <div className="relative bg-white rounded-lg shadow-xl w-full max-w-lg p-6">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                <ShieldAlert className="text-blue-600 w-5 h-5" /> QA Record Audit
              </h2>
              <button onClick={() => setAuditModalOpen(false)} className="text-gray-500 hover:text-gray-700"><X className="h-5 w-5" /></button>
            </div>
            
            <div className="bg-gray-50 p-4 rounded-lg border border-gray-200 mb-6 text-sm text-gray-700 font-mono overflow-x-auto">
              <p className="font-bold text-gray-900 mb-2 border-b pb-1">Target: {selectedRecord.recordType} #{selectedRecord.id}</p>
              <pre className="whitespace-pre-wrap text-xs">
                {JSON.stringify(
                  Object.fromEntries(Object.entries(selectedRecord).filter(([k]) => !['recordType', 'patientId', 'existingAuditId'].includes(k))), 
                null, 2)}
              </pre>
            </div>

            <form onSubmit={handleAuditSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Auditing Officer</label>
                <select required value={auditData.officerId} onChange={e => setAuditData({...auditData, officerId: parseInt(e.target.value)})} className="block w-full rounded-md border-0 py-1.5 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 focus:ring-2 focus:ring-blue-600 sm:text-sm sm:leading-6">
                  {officers.map((o:any) => <option key={o.id} value={o.id}>{o.name}</option>)}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Verification Status</label>
                <div className="flex gap-4">
                  <label className={`flex-1 flex items-center justify-center gap-2 p-3 rounded-lg border cursor-pointer ${auditData.status === 'Verified' ? 'bg-green-50 border-green-500 text-green-700 ring-1 ring-green-500' : 'hover:bg-gray-50'}`}>
                    <input type="radio" name="auditStatus" value="Verified" checked={auditData.status === 'Verified'} onChange={e => setAuditData({...auditData, status: e.target.value})} className="hidden" />
                    <CheckCircle className="w-5 h-5"/> Data Accurate
                  </label>
                  <label className={`flex-1 flex items-center justify-center gap-2 p-3 rounded-lg border cursor-pointer ${auditData.status === 'Flagged' ? 'bg-red-50 border-red-500 text-red-700 ring-1 ring-red-500' : 'hover:bg-gray-50'}`}>
                    <input type="radio" name="auditStatus" value="Flagged" checked={auditData.status === 'Flagged'} onChange={e => setAuditData({...auditData, status: e.target.value})} className="hidden" />
                    <AlertTriangle className="w-5 h-5"/> Flag Error
                  </label>
                </div>
              </div>

              {auditData.status === 'Flagged' && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1 text-red-700">Reason for Flagging / Correction Required</label>
                  <textarea required rows={3} value={auditData.flagReason} onChange={e => setAuditData({...auditData, flagReason: e.target.value})} className="block w-full rounded-md border-0 py-1.5 text-gray-900 shadow-sm ring-1 ring-inset ring-red-300 focus:ring-2 focus:ring-red-600 sm:text-sm sm:leading-6 border-red-200 bg-red-50" placeholder="E.g. Incorrect coding, missing physician signature, typo in dosage..." />
                </div>
              )}

              <div className="mt-6 flex justify-end gap-3 pt-4 border-t border-gray-100">
                <button type="button" onClick={() => setAuditModalOpen(false)} className="px-4 py-2 text-sm text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50">Cancel</button>
                <button type="submit" disabled={isSubmitting} className="px-4 py-2 text-sm text-white bg-blue-600 rounded-md hover:bg-blue-500 disabled:opacity-50">
                  {isSubmitting ? 'Saving...' : 'Submit Audit'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
