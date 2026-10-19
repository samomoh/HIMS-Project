'use client';

import { useState } from 'react';
import { Microscope, UserCircle, Search, FileText, CheckCircle, Clock, Send, X } from 'lucide-react';
import Link from 'next/link';
import { addSpecialistRecommendationAction } from './actions';

type Referral = any;

export default function SpecialistClient({ referrals }: { referrals: Referral[] }) {
  const [activeTab, setActiveTab] = useState<'Incoming' | 'Consulted'>('Incoming');
  const [searchQuery, setSearchQuery] = useState('');
  
  // Modal State
  const [consultModalOpen, setConsultModalOpen] = useState(false);
  const [selectedReferral, setSelectedReferral] = useState<Referral | null>(null);
  const [recommendation, setRecommendation] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Simple client-side toggle to mock whether a specialist has answered.
  // We check if the notes string contains the "SPECIALIST RECOMMENDATION" delimiter.
  const isConsulted = (ref: Referral) => ref.notes?.includes('SPECIALIST RECOMMENDATION');

  const incomingReferrals = referrals.filter(r => !isConsulted(r) && (
    r.patient.firstName.toLowerCase().includes(searchQuery.toLowerCase()) || 
    r.patient.lastName.toLowerCase().includes(searchQuery.toLowerCase())
  ));
  
  const consultedReferrals = referrals.filter(r => isConsulted(r) && (
    r.patient.firstName.toLowerCase().includes(searchQuery.toLowerCase()) || 
    r.patient.lastName.toLowerCase().includes(searchQuery.toLowerCase())
  ));

  const displayList = activeTab === 'Incoming' ? incomingReferrals : consultedReferrals;

  const openConsultModal = (ref: Referral) => {
    setSelectedReferral(ref);
    setRecommendation('');
    setConsultModalOpen(true);
  };

  const handleConsultSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedReferral || !recommendation.trim()) return;

    setIsSubmitting(true);
    try {
      await addSpecialistRecommendationAction(selectedReferral.id, recommendation);
      window.location.reload();
    } catch (err) {
      console.error(err);
      alert('Failed to submit recommendation.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <>
      <div className="flex border-b border-gray-200 mb-6 space-x-2">
        <button
          onClick={() => setActiveTab('Incoming')}
          className={`px-4 py-2 border-b-2 text-sm font-medium transition-colors flex items-center ${activeTab === 'Incoming' ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}
        >
          <Clock className="w-4 h-4 mr-2" /> Pending Referrals
        </button>
        <button
          onClick={() => setActiveTab('Consulted')}
          className={`px-4 py-2 border-b-2 text-sm font-medium transition-colors flex items-center ${activeTab === 'Consulted' ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}
        >
          <CheckCircle className="w-4 h-4 mr-2" /> Completed Consults
        </button>
      </div>

      <div className="space-y-6">
        <div className="relative max-w-md">
          <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
            <Search className="h-5 w-5 text-gray-400" />
          </div>
          <input
            type="text"
            placeholder="Search referrals by patient name..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="block w-full rounded-md border-0 py-2 pl-10 text-gray-900 ring-1 ring-inset ring-gray-300 focus:ring-2 focus:ring-blue-600 sm:text-sm sm:leading-6"
          />
        </div>

        <div className="bg-white shadow-sm ring-1 ring-gray-200 rounded-xl overflow-hidden">
          <ul role="list" className="divide-y divide-gray-100">
            {displayList.length === 0 ? (
              <li className="p-12 text-center text-sm text-gray-500 flex flex-col items-center">
                <UserCircle className="h-12 w-12 text-gray-300 mb-3" />
                No {activeTab.toLowerCase()} referrals found.
              </li>
            ) : (
              displayList.map((ref: any) => (
                <li key={ref.id} className="relative flex justify-between gap-x-6 px-6 py-5 hover:bg-gray-50 flex-col sm:flex-row">
                  <div className="flex min-w-0 gap-x-4 mb-4 sm:mb-0">
                    <div className="min-w-0 flex-auto space-y-1">
                      <div className="flex items-center gap-2">
                        <p className="text-base font-bold leading-6 text-gray-900">
                          {ref.patient.firstName} {ref.patient.lastName}
                        </p>
                        <span className="inline-flex items-center rounded-md bg-purple-50 px-2 py-1 text-xs font-medium text-purple-700 ring-1 ring-inset ring-purple-600/20">
                          Consult Needed
                        </span>
                      </div>
                      <p className="flex text-sm leading-5 text-gray-700">
                        <span className="font-semibold mr-1">Primary Diagnosis:</span> {ref.diagnosis}
                      </p>
                      <p className="flex text-sm leading-5 text-gray-700">
                        <span className="font-semibold mr-1">Referred By:</span> Dr. {ref.doctor.name}
                      </p>
                      
                      <div className="mt-2 bg-purple-50 p-3 rounded-md border border-purple-100 max-w-2xl">
                        <p className="text-xs font-bold text-purple-800 uppercase mb-1">Reason for Referral / Transfer Details</p>
                        <p className="text-sm text-purple-900">{ref.referralNote}</p>
                      </div>
                    </div>
                  </div>
                  <div className="flex shrink-0 items-start sm:items-center gap-x-4 flex-wrap gap-y-2">
                    <div className="hidden sm:flex sm:flex-col sm:items-end w-full sm:w-auto">
                      <p className="text-sm leading-6 text-gray-900 flex items-center gap-1 font-medium">
                        {new Date(ref.recordDate).toLocaleDateString()}
                      </p>
                    </div>
                    <Link href={`/patients/${ref.patientId}`} className="w-full sm:w-auto text-center rounded-md bg-white px-3 py-2 text-sm font-semibold text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 hover:bg-gray-50 flex items-center justify-center">
                      <FileText className="h-4 w-4 mr-1" /> View Full History
                    </Link>
                    {activeTab === 'Incoming' && (
                      <button onClick={() => openConsultModal(ref)} className="w-full sm:w-auto text-center rounded-md bg-blue-600 px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-blue-500 flex items-center justify-center">
                        <Microscope className="h-4 w-4 mr-1" /> Provide Recommendation
                      </button>
                    )}
                  </div>
                </li>
              ))
            )}
          </ul>
        </div>
      </div>

      {/* Specialist Consult Modal */}
      {consultModalOpen && selectedReferral && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="fixed inset-0 bg-gray-900/60" onClick={() => setConsultModalOpen(false)} />
          <div className="relative bg-white rounded-lg shadow-xl w-full max-w-2xl p-6 flex flex-col max-h-[90vh]">
            <div className="flex justify-between items-center mb-4 shrink-0">
              <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                <Microscope className="text-blue-600" /> Specialist Consultation
              </h2>
              <button onClick={() => setConsultModalOpen(false)} className="text-gray-500 hover:text-gray-700"><X className="h-5 w-5" /></button>
            </div>
            
            <div className="overflow-y-auto flex-1 space-y-4 pr-2">
              <div className="bg-gray-50 p-4 rounded-lg border border-gray-100 text-sm text-gray-700">
                <p className="mb-2"><span className="font-semibold text-gray-900">Patient:</span> {selectedReferral.patient.firstName} {selectedReferral.patient.lastName}</p>
                <p className="mb-2"><span className="font-semibold text-gray-900">Primary Diagnosis:</span> {selectedReferral.diagnosis}</p>
                <p><span className="font-semibold text-gray-900">Referral Request:</span> {selectedReferral.referralNote}</p>
              </div>

              <form id="consultForm" onSubmit={handleConsultSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-900 mb-2">Specialist Recommendations & Findings</label>
                   <p className="text-xs text-gray-500 mb-2">After reviewing the patient&apos;s full history, laboratory, and imaging results, detail your specialized treatment plan here.</p>
                  <textarea
                    required
                    rows={10}
                    value={recommendation}
                    onChange={(e) => setRecommendation(e.target.value)}
                    placeholder="Enter your clinical findings, advanced treatment plan, or surgical recommendations..."
                    className="block w-full rounded-md border-0 py-2 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 focus:ring-2 focus:ring-inset focus:ring-blue-600 sm:text-sm sm:leading-6 font-mono"
                  />
                </div>
              </form>
            </div>

            <div className="mt-6 flex justify-end gap-3 pt-4 border-t border-gray-100 shrink-0">
              <button type="button" onClick={() => setConsultModalOpen(false)} className="px-4 py-2 text-sm text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50">Cancel</button>
              <button form="consultForm" type="submit" disabled={isSubmitting} className="px-4 py-2 text-sm text-white bg-blue-600 rounded-md hover:bg-blue-500 disabled:opacity-50 flex items-center">
                {isSubmitting ? 'Sending...' : <><Send className="w-4 h-4 mr-2" /> Send to Primary Care</>}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
