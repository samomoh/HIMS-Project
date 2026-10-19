'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { submitClinicalReviewAction } from '../../actions';

type Doctor = { id: number; name: string; email: string };

const diagnosticOptions = [
  'Complete Blood Count (CBC)',
  'Basic Metabolic Panel (BMP)',
  'Lipid Panel',
  'Urinalysis',
  'Chest X-Ray',
  'CT Scan - Head',
  'MRI - Brain',
  'Ultrasound - Abdomen',
  'Electrocardiogram (ECG)',
];

export default function ClinicalReviewForm({ 
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
    consultation: '',
    physicalExamination: '',
    diagnosis: '',
    treatment: '',
    notes: '',
    diagnosticPriority: 'Routine',
  });

  const [selectedDiagnostics, setSelectedDiagnostics] = useState<string[]>([]);
  const [showOtherDiagnostic, setShowOtherDiagnostic] = useState(false);
  const [otherDiagnosticText, setOtherDiagnosticText] = useState('');

  const handleDiagnosticToggle = (option: string) => {
    if (option === 'Other') {
      setShowOtherDiagnostic(!showOtherDiagnostic);
      return;
    }
    setSelectedDiagnostics(prev => 
      prev.includes(option) ? prev.filter(o => o !== option) : [...prev, option]
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.doctorId) {
      alert("Please select a doctor.");
      return;
    }
    
    setIsSubmitting(true);
    try {
      await submitClinicalReviewAction({
        patientId,
        doctorId: formData.doctorId,
        consultation: formData.consultation,
        physicalExamination: formData.physicalExamination,
        diagnosis: formData.diagnosis,
        treatment: formData.treatment,
        notes: formData.notes,
        diagnosticPriority: formData.diagnosticPriority,
        diagnostics: showOtherDiagnostic && otherDiagnosticText.trim() 
          ? [...selectedDiagnostics, otherDiagnosticText.trim()]
          : selectedDiagnostics
      });
      router.push(`/patients/${patientId}`);
      router.refresh();
    } catch (err) {
      console.error(err);
      alert('Failed to submit clinical review');
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
              {doctors.map(d => (
                <option key={d.id} value={d.id}>Dr. {d.name}</option>
              ))}
            </select>
          </div>
        </div>

        <div className="border-t border-gray-100 pt-6">
          <label className="block text-base font-semibold leading-6 text-gray-900">1. Consultation</label>
          <p className="mt-1 text-sm text-gray-500">History of present illness, patient complaints, and general observations.</p>
          <div className="mt-2">
            <textarea
              required
              rows={4}
              value={formData.consultation}
              onChange={e => setFormData({ ...formData, consultation: e.target.value })}
              className="block w-full rounded-md border-0 py-1.5 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 focus:ring-2 focus:ring-inset focus:ring-blue-600 sm:text-sm sm:leading-6"
              placeholder="Enter consultation notes..."
            />
          </div>
        </div>

        <div className="border-t border-gray-100 pt-6">
          <label className="block text-base font-semibold leading-6 text-gray-900">2. Physical Examination</label>
          <p className="mt-1 text-sm text-gray-500">Vitals, system-by-system findings, and clinical signs.</p>
          <div className="mt-2">
            <textarea
              required
              rows={4}
              value={formData.physicalExamination}
              onChange={e => setFormData({ ...formData, physicalExamination: e.target.value })}
              className="block w-full rounded-md border-0 py-1.5 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 focus:ring-2 focus:ring-inset focus:ring-blue-600 sm:text-sm sm:leading-6"
              placeholder="Enter physical examination details..."
            />
          </div>
        </div>

        <div className="border-t border-gray-100 pt-6">
          <label className="block text-base font-semibold leading-6 text-gray-900">3. Preliminary Diagnosis</label>
          <p className="mt-1 text-sm text-gray-500">Initial assessment or differential diagnosis.</p>
          <div className="mt-2">
            <input
              required
              type="text"
              value={formData.diagnosis}
              onChange={e => setFormData({ ...formData, diagnosis: e.target.value })}
              className="block w-full rounded-md border-0 py-1.5 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 focus:ring-2 focus:ring-inset focus:ring-blue-600 sm:text-sm sm:leading-6"
              placeholder="e.g. Acute Bronchitis"
            />
          </div>
        </div>

        <div className="border-t border-gray-100 pt-6">
          <div className="flex justify-between items-start mb-4">
            <div>
              <label className="block text-base font-semibold leading-6 text-gray-900">4. Diagnostic Services</label>
              <p className="mt-1 text-sm text-gray-500">Recommend laboratory tests, imaging, scans, or other investigations.</p>
            </div>
            <div className="w-48">
              <label className="block text-xs font-semibold leading-6 text-gray-700">Priority</label>
              <select
                value={formData.diagnosticPriority}
                onChange={e => setFormData({ ...formData, diagnosticPriority: e.target.value })}
                className="mt-1 block w-full rounded-md border-0 py-1.5 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 focus:ring-2 focus:ring-inset focus:ring-blue-600 sm:text-sm sm:leading-6 font-medium"
              >
                <option value="Routine">Routine</option>
                <option value="Urgent">Urgent</option>
                <option value="Emergency">Emergency</option>
              </select>
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {diagnosticOptions.map(option => (
              <label key={option} className="flex items-center gap-3 p-3 rounded-lg border border-gray-200 hover:bg-gray-50 cursor-pointer transition-colors">
                <input
                  type="checkbox"
                  checked={selectedDiagnostics.includes(option)}
                  onChange={() => handleDiagnosticToggle(option)}
                  className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-600"
                />
                <span className="text-sm text-gray-900">{option}</span>
              </label>
            ))}
            <label className="flex items-center gap-3 p-3 rounded-lg border border-gray-200 hover:bg-gray-50 cursor-pointer transition-colors">
              <input
                type="checkbox"
                checked={showOtherDiagnostic}
                onChange={() => handleDiagnosticToggle('Other')}
                className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-600"
              />
              <span className="text-sm text-gray-900">Other</span>
            </label>
          </div>
          
          {showOtherDiagnostic && (
            <div className="mt-3">
              <input
                type="text"
                value={otherDiagnosticText}
                onChange={(e) => setOtherDiagnosticText(e.target.value)}
                placeholder="Please specify other diagnostic services..."
                className="block w-full rounded-md border-0 py-1.5 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 focus:ring-2 focus:ring-inset focus:ring-blue-600 sm:text-sm sm:leading-6"
              />
            </div>
          )}
        </div>

        <div className="border-t border-gray-100 pt-6">
          <label className="block text-base font-semibold leading-6 text-gray-900">5. Treatment Plan & Notes</label>
          <p className="mt-1 text-sm text-gray-500">Proposed medications, therapies, or follow-up actions.</p>
          <div className="mt-2 space-y-4">
            <input
              type="text"
              value={formData.treatment}
              onChange={e => setFormData({ ...formData, treatment: e.target.value })}
              className="block w-full rounded-md border-0 py-1.5 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 focus:ring-2 focus:ring-inset focus:ring-blue-600 sm:text-sm sm:leading-6"
              placeholder="Primary treatment (optional)"
            />
            <textarea
              rows={3}
              value={formData.notes}
              onChange={e => setFormData({ ...formData, notes: e.target.value })}
              className="block w-full rounded-md border-0 py-1.5 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 focus:ring-2 focus:ring-inset focus:ring-blue-600 sm:text-sm sm:leading-6"
              placeholder="Additional notes for staff or patient (optional)"
            />
          </div>
        </div>

      </div>
      
      <div className="bg-gray-50 px-6 py-4 border-t border-gray-200 flex items-center justify-end gap-x-6">
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
          {isSubmitting ? 'Submitting...' : 'Complete Clinical Review'}
        </button>
      </div>
    </form>
  );
}
