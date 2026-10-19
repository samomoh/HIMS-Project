'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { submitReviewResultsAction } from '../../actions';

type Doctor = { id: number; name: string };

export default function ReviewResultsForm({ 
  patientId, 
  doctors 
}: { 
  patientId: number; 
  doctors: Doctor[] 
}) {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const [formData, setFormData] = useState({
    doctorId: doctors.length > 0 ? doctors[0].id : 0,
    diagnosis: '',
    decisionType: '',
    referralNote: '',
    procedureNote: '',
    wardAdmission: '',
    medication: '',
    dosage: '',
    instructions: '',
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.doctorId) {
      alert("Please select a doctor.");
      return;
    }
    if (!formData.decisionType) {
      alert("Please select a treatment decision.");
      return;
    }
    
    setIsSubmitting(true);
    try {
      await submitReviewResultsAction({
        patientId,
        doctorId: formData.doctorId,
        diagnosis: formData.diagnosis,
        decisionType: formData.decisionType,
        referralNote: formData.referralNote,
        procedureNote: formData.procedureNote,
        wardAdmission: formData.wardAdmission,
        medication: formData.medication,
        dosage: formData.dosage,
        instructions: formData.instructions,
      });
      router.push(`/patients/${patientId}`);
      router.refresh();
    } catch (err) {
      console.error(err);
      alert('Failed to submit review results');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="bg-white shadow-sm ring-1 ring-gray-200 rounded-xl overflow-hidden">
      <div className="p-6 space-y-8">
        
        {/* Doctor Selection */}
        <div>
          <label className="block text-sm font-semibold leading-6 text-gray-900">Attending Physician</label>
          <div className="mt-2">
            <select
              required
              value={formData.doctorId}
              onChange={e => setFormData({ ...formData, doctorId: parseInt(e.target.value, 10) })}
              className="block w-full max-w-md rounded-md border-0 py-1.5 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 focus:ring-2 focus:ring-inset focus:ring-blue-600 sm:text-sm sm:leading-6"
            >
              <option value="" disabled>Select Doctor...</option>
              {doctors.map(d => (
                <option key={d.id} value={d.id}>Dr. {d.name}</option>
              ))}
            </select>
          </div>
        </div>

        <div className="border-t border-gray-100 pt-6">
          <label className="block text-base font-semibold leading-6 text-gray-900">1. Confirmed Diagnosis</label>
          <p className="mt-1 text-sm text-gray-500">State the final confirmed diagnosis after reviewing lab results or imaging.</p>
          <div className="mt-2">
            <input
              required
              type="text"
              value={formData.diagnosis}
              onChange={e => setFormData({ ...formData, diagnosis: e.target.value })}
              className="block w-full rounded-md border-0 py-1.5 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 focus:ring-2 focus:ring-inset focus:ring-blue-600 sm:text-sm sm:leading-6"
              placeholder="e.g. Type 2 Diabetes Mellitus"
            />
          </div>
        </div>

        <div className="border-t border-gray-100 pt-6">
          <label className="block text-base font-semibold leading-6 text-gray-900">2. Treatment Decision</label>
          <p className="mt-1 text-sm text-gray-500">Select the primary outcome for this clinical review.</p>
          <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-4">
            {['Refer Out', 'Procedure/Surgery', 'Internal Admission', 'Pharmacy'].map(option => (
              <label key={option} className={`flex items-center gap-3 p-4 rounded-lg border cursor-pointer transition-colors ${formData.decisionType === option ? 'border-blue-600 bg-blue-50 ring-1 ring-blue-600' : 'border-gray-200 hover:bg-gray-50'}`}>
                <input
                  type="radio"
                  name="decisionType"
                  value={option}
                  checked={formData.decisionType === option}
                  onChange={e => setFormData({ ...formData, decisionType: e.target.value })}
                  className="h-4 w-4 border-gray-300 text-blue-600 focus:ring-blue-600"
                />
                <span className={`text-sm font-medium ${formData.decisionType === option ? 'text-blue-900' : 'text-gray-900'}`}>{option}</span>
              </label>
            ))}
          </div>
        </div>

        {/* Dynamic Fields Based on Decision */}
        {formData.decisionType === 'Refer Out' && (
          <div className="border-t border-gray-100 pt-6 bg-gray-50 -mx-6 px-6 pb-6">
            <label className="block text-base font-semibold leading-6 text-gray-900">Referral Note & Coordination</label>
            <div className="mt-2">
              <textarea
                required
                rows={4}
                value={formData.referralNote}
                onChange={e => setFormData({ ...formData, referralNote: e.target.value })}
                className="block w-full rounded-md border-0 py-1.5 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 focus:ring-2 focus:ring-inset focus:ring-blue-600 sm:text-sm sm:leading-6"
                placeholder="Include reason for transfer, target hospital/specialist, and coordination details..."
              />
            </div>
          </div>
        )}

        {formData.decisionType === 'Procedure/Surgery' && (
          <div className="border-t border-gray-100 pt-6 bg-gray-50 -mx-6 px-6 pb-6">
            <label className="block text-base font-semibold leading-6 text-gray-900">Procedure Details</label>
            <div className="mt-2">
              <textarea
                required
                rows={4}
                value={formData.procedureNote}
                onChange={e => setFormData({ ...formData, procedureNote: e.target.value })}
                className="block w-full rounded-md border-0 py-1.5 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 focus:ring-2 focus:ring-inset focus:ring-blue-600 sm:text-sm sm:leading-6"
                placeholder="Specify the required procedure, therapy, or surgery..."
              />
            </div>
          </div>
        )}

        {formData.decisionType === 'Internal Admission' && (
          <div className="border-t border-gray-100 pt-6 bg-gray-50 -mx-6 px-6 pb-6">
            <label className="block text-base font-semibold leading-6 text-gray-900">Inpatient Care & Monitoring</label>
            <div className="mt-2">
              <textarea
                required
                rows={4}
                value={formData.wardAdmission}
                onChange={e => setFormData({ ...formData, wardAdmission: e.target.value })}
                className="block w-full rounded-md border-0 py-1.5 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 focus:ring-2 focus:ring-inset focus:ring-blue-600 sm:text-sm sm:leading-6"
                placeholder="Specify ward care instructions, monitoring frequency, and required protocols..."
              />
            </div>
          </div>
        )}

        {formData.decisionType === 'Pharmacy' && (
          <div className="border-t border-gray-100 pt-6 bg-gray-50 -mx-6 px-6 pb-6">
            <label className="block text-base font-semibold leading-6 text-gray-900 mb-4">Prescription & Counseling</label>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium leading-6 text-gray-900">Medication Name</label>
                <input
                  required
                  type="text"
                  value={formData.medication}
                  onChange={e => setFormData({ ...formData, medication: e.target.value })}
                  className="mt-1 block w-full rounded-md border-0 py-1.5 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 focus:ring-2 focus:ring-inset focus:ring-blue-600 sm:text-sm sm:leading-6"
                />
              </div>
              <div>
                <label className="block text-sm font-medium leading-6 text-gray-900">Dosage</label>
                <input
                  required
                  type="text"
                  value={formData.dosage}
                  onChange={e => setFormData({ ...formData, dosage: e.target.value })}
                  className="mt-1 block w-full rounded-md border-0 py-1.5 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 focus:ring-2 focus:ring-inset focus:ring-blue-600 sm:text-sm sm:leading-6"
                  placeholder="e.g. 500mg"
                />
              </div>
              <div>
                <label className="block text-sm font-medium leading-6 text-gray-900">Counseling & Instructions</label>
                <textarea
                  required
                  rows={3}
                  value={formData.instructions}
                  onChange={e => setFormData({ ...formData, instructions: e.target.value })}
                  className="mt-1 block w-full rounded-md border-0 py-1.5 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 focus:ring-2 focus:ring-inset focus:ring-blue-600 sm:text-sm sm:leading-6"
                  placeholder="Instructions for the patient and pharmacist..."
                />
              </div>
            </div>
          </div>
        )}

      </div>
      
      <div className="bg-gray-100 px-6 py-4 border-t border-gray-200 flex items-center justify-end gap-x-6">
        <button
          type="button"
          onClick={() => router.back()}
          className="text-sm font-semibold leading-6 text-gray-900 hover:text-gray-700"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={isSubmitting}
          className="rounded-md bg-blue-600 px-6 py-2 text-sm font-semibold text-white shadow-sm hover:bg-blue-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600 disabled:opacity-50"
        >
          {isSubmitting ? 'Saving Decision...' : 'Confirm Decision & Save'}
        </button>
      </div>
    </form>
  );
}
