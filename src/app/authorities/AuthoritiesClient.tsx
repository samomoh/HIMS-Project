'use client';

import { useState } from 'react';
import { Landmark, ShieldAlert, BarChart3, Download, FileSpreadsheet, Activity, CheckCircle, AlertTriangle, PieChart } from 'lucide-react';
import Link from 'next/link';

type Stats = {
  totalDiagnoses: number;
  flaggedAudits: number;
  totalPatients: number;
  outcomes: {
    admitted: number;
    referred: number;
    procedure: number;
    pharmacy: number;
    referredIn: number;
    deaths: number;
  };
};

type Audit = any;
type LabResult = any;

export default function AuthoritiesClient({ 
  stats,
  audits,
  labs
}: { 
  stats: Stats,
  audits: Audit[],
  labs: LabResult[]
}) {
  const [activeTab, setActiveTab] = useState<'Compliance' | 'Public Health' | 'Outcomes'>('Compliance');

  const downloadComplianceReport = () => {
    const header = "AuditDate,RecordType,RecordID,PatientID,OfficerID,Status,FlagReason\n";
    const rows = audits.map((a: any) => 
      `${new Date(a.auditedAt).toISOString()},${a.recordType},${a.recordId},${a.patientId},${a.officerId},${a.status},"${a.flagReason || ''}"`
    ).join("\n");
    
    const blob = new Blob([header + rows], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `hospital_compliance_audit_${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  const downloadPublicHealthReport = () => {
    const header = "CompletionDate,TestName,Result,Priority\n";
    const rows = labs.map((l: any) => 
      `${l.dateCompleted ? new Date(l.dateCompleted).toISOString() : ''},"${l.testName}","${l.result || ''}",${l.priority}`
    ).join("\n");
    
    const blob = new Blob([header + rows], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `public_health_surveillance_${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  return (
    <>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3 mb-6">
        <div className="bg-white overflow-hidden shadow-sm rounded-xl ring-1 ring-gray-200 p-5 flex items-center">
          <div className="flex-shrink-0 bg-blue-100 rounded-md p-3">
            <Activity className="h-6 w-6 text-blue-600" />
          </div>
          <div className="ml-4 flex-1">
            <p className="text-sm font-medium text-gray-500">Population Reached</p>
            <p className="text-2xl font-bold text-gray-900">{stats.totalPatients.toLocaleString()}</p>
          </div>
        </div>
        <div className="bg-white overflow-hidden shadow-sm rounded-xl ring-1 ring-gray-200 p-5 flex items-center">
          <div className="flex-shrink-0 bg-green-100 rounded-md p-3">
            <BarChart3 className="h-6 w-6 text-green-600" />
          </div>
          <div className="ml-4 flex-1">
            <p className="text-sm font-medium text-gray-500">Total Diagnoses Logged</p>
            <p className="text-2xl font-bold text-gray-900">{stats.totalDiagnoses.toLocaleString()}</p>
          </div>
        </div>
        <div className="bg-white overflow-hidden shadow-sm rounded-xl ring-1 ring-gray-200 p-5 flex items-center">
          <div className="flex-shrink-0 bg-red-100 rounded-md p-3">
            <ShieldAlert className="h-6 w-6 text-red-600" />
          </div>
          <div className="ml-4 flex-1">
            <p className="text-sm font-medium text-gray-500">Flagged Compliance Errors</p>
            <p className="text-2xl font-bold text-red-600">{stats.flaggedAudits.toLocaleString()}</p>
          </div>
        </div>
      </div>

      <div className="flex border-b border-gray-200 mb-6 space-x-2">
        <button
          onClick={() => setActiveTab('Compliance')}
          className={`px-4 py-2 border-b-2 text-sm font-medium transition-colors flex items-center ${activeTab === 'Compliance' ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}
        >
          <ShieldAlert className="w-4 h-4 mr-2" /> Hospital Compliance Logs
        </button>
        <button
          onClick={() => setActiveTab('Public Health')}
          className={`px-4 py-2 border-b-2 text-sm font-medium transition-colors flex items-center ${activeTab === 'Public Health' ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}
        >
          <Landmark className="w-4 h-4 mr-2" /> Public Health Surveillance
        </button>
        <button
          onClick={() => setActiveTab('Outcomes')}
          className={`px-4 py-2 border-b-2 text-sm font-medium transition-colors flex items-center ${activeTab === 'Outcomes' ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}
        >
          <PieChart className="w-4 h-4 mr-2" /> Patient Outcomes Analytics
        </button>
      </div>

      {activeTab === 'Compliance' && (
        <div className="space-y-6">
          <div className="flex justify-between items-center bg-white p-4 rounded-xl shadow-sm ring-1 ring-gray-200">
            <p className="text-sm text-gray-600">Review internal quality and compliance audits conducted by the hospital&apos;s Medical Records officers.</p>
            <button onClick={downloadComplianceReport} className="flex items-center rounded-md bg-blue-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-blue-500">
              <Download className="h-4 w-4 mr-2" /> Export Audit Log
            </button>
          </div>

          <div className="bg-white shadow-sm ring-1 ring-gray-200 rounded-xl overflow-hidden">
            <table className="min-w-full divide-y divide-gray-300">
              <thead className="bg-gray-50">
                <tr>
                  <th scope="col" className="py-3.5 pl-4 pr-3 text-left text-sm font-semibold text-gray-900">Audit Date</th>
                  <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">Record Analyzed</th>
                  <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">Compliance Status</th>
                  <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">Correction Notes</th>
                  <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">HIM Officer</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {audits.length === 0 ? (
                  <tr><td colSpan={5} className="py-8 text-center text-sm text-gray-500">No compliance audits submitted.</td></tr>
                ) : (
                  audits.map((a: any) => (
                    <tr key={a.id} className="hover:bg-gray-50">
                      <td className="whitespace-nowrap py-3 pl-4 pr-3 text-sm text-gray-500">{new Date(a.auditedAt).toLocaleString()}</td>
                      <td className="whitespace-nowrap px-3 py-3 text-sm font-medium text-gray-900">{a.recordType} #{a.recordId}</td>
                      <td className="whitespace-nowrap px-3 py-3 text-sm">
                        {a.status === 'Verified' ? 
                          <span className="inline-flex items-center text-green-700 bg-green-50 px-2 py-1 rounded text-xs font-medium border border-green-200"><CheckCircle className="w-3 h-3 mr-1"/> Data Accurate</span> : 
                          <span className="inline-flex items-center text-red-700 bg-red-50 px-2 py-1 rounded text-xs font-bold border border-red-200"><AlertTriangle className="w-3 h-3 mr-1"/> Flagged Error</span>
                        }
                      </td>
                      <td className="px-3 py-3 text-sm text-gray-700 max-w-sm">{a.flagReason || <span className="text-gray-400 italic">None</span>}</td>
                      <td className="whitespace-nowrap px-3 py-3 text-sm text-gray-500">{a.officer.name}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {activeTab === 'Public Health' && (
        <div className="space-y-6">
          <div className="flex justify-between items-center bg-white p-4 rounded-xl shadow-sm ring-1 ring-gray-200">
            <p className="text-sm text-gray-600">Surveillance of hospital diagnostic trends to monitor regional outbreaks and population health.</p>
            <button onClick={downloadPublicHealthReport} className="flex items-center rounded-md bg-blue-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-blue-500">
              <FileSpreadsheet className="h-4 w-4 mr-2" /> Export Diagnostics Data
            </button>
          </div>

          <div className="bg-white shadow-sm ring-1 ring-gray-200 rounded-xl overflow-hidden">
            <table className="min-w-full divide-y divide-gray-300">
              <thead className="bg-gray-50">
                <tr>
                  <th scope="col" className="py-3.5 pl-4 pr-3 text-left text-sm font-semibold text-gray-900">Completion Date</th>
                  <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">Diagnostic Test</th>
                  <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">Priority Level</th>
                  <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">Anonymized Results</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {labs.length === 0 ? (
                  <tr><td colSpan={4} className="py-8 text-center text-sm text-gray-500">No recent diagnostic data available.</td></tr>
                ) : (
                  labs.map((l: any) => (
                    <tr key={l.id} className="hover:bg-gray-50">
                      <td className="whitespace-nowrap py-3 pl-4 pr-3 text-sm text-gray-500">{l.dateCompleted ? new Date(l.dateCompleted).toLocaleString() : 'Unknown'}</td>
                      <td className="whitespace-nowrap px-3 py-3 text-sm font-bold text-gray-900">{l.testName}</td>
                      <td className="whitespace-nowrap px-3 py-3 text-sm">
                        <span className={`inline-flex items-center rounded-md px-2 py-0.5 text-xs font-bold ring-1 ring-inset uppercase ${
                          l.priority === 'Emergency' ? 'bg-red-50 text-red-700 ring-red-600/20' : 
                          l.priority === 'Urgent' ? 'bg-orange-50 text-orange-700 ring-orange-600/20' : 'bg-gray-50 text-gray-600 ring-gray-500/10'
                        }`}>
                          {l.priority}
                        </span>
                      </td>
                      <td className="px-3 py-3 text-sm text-gray-700 max-w-md font-mono text-xs">{l.result}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {activeTab === 'Outcomes' && (
        <div className="space-y-6">
          <div className="bg-white p-4 rounded-xl shadow-sm ring-1 ring-gray-200">
            <h3 className="text-lg font-bold text-gray-900 mb-2">Hospital Efficacy & Clinical Decisions</h3>
            <p className="text-sm text-gray-600 mb-6">Aggregated breakdown of primary clinical outcomes following diagnostic reviews.</p>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              <div className="bg-purple-50 rounded-lg p-4 border border-purple-100 flex flex-col justify-center items-center text-center">
                <span className="text-purple-700 text-sm font-bold uppercase tracking-wider mb-2">Internal Admissions</span>
                <span className="text-4xl font-black text-purple-900">{stats.outcomes.admitted}</span>
              </div>
              
              <div className="bg-blue-50 rounded-lg p-4 border border-blue-100 flex flex-col justify-center items-center text-center">
                <span className="text-blue-700 text-sm font-bold uppercase tracking-wider mb-2">Procedures / Surgery</span>
                <span className="text-4xl font-black text-blue-900">{stats.outcomes.procedure}</span>
              </div>
              
              <div className="bg-green-50 rounded-lg p-4 border border-green-100 flex flex-col justify-center items-center text-center">
                <span className="text-green-700 text-sm font-bold uppercase tracking-wider mb-2">Pharmacy / Rx</span>
                <span className="text-4xl font-black text-green-900">{stats.outcomes.pharmacy}</span>
              </div>
              
              <div className="bg-orange-50 rounded-lg p-4 border border-orange-100 flex flex-col justify-center items-center text-center">
                <span className="text-orange-700 text-sm font-bold uppercase tracking-wider mb-2">Referred Out</span>
                <span className="text-4xl font-black text-orange-900">{stats.outcomes.referred}</span>
              </div>

              <div className="bg-teal-50 rounded-lg p-4 border border-teal-100 flex flex-col justify-center items-center text-center">
                <span className="text-teal-700 text-sm font-bold uppercase tracking-wider mb-2">Total Referred In</span>
                <span className="text-4xl font-black text-teal-900">{stats.outcomes.referredIn}</span>
              </div>

              <div className="bg-gray-100 rounded-lg p-4 border border-gray-200 flex flex-col justify-center items-center text-center">
                <span className="text-gray-700 text-sm font-bold uppercase tracking-wider mb-2">Total Death</span>
                <span className="text-4xl font-black text-gray-900">{stats.outcomes.deaths}</span>
              </div>
            </div>
            
            <div className="mt-6 border-t border-gray-100 pt-4">
               <p className="text-xs text-gray-500 flex items-center justify-center">
                 <CheckCircle className="w-3 h-3 mr-1" />
                 Counts combine clinical decisions, patient intake categories, and recorded Emergency outcomes.
               </p>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
