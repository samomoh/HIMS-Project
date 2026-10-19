'use client';

import { useState, useRef } from 'react';
import { Radiation, FileText, CheckCircle, Clock, UploadCloud, X, Calendar as CalendarIcon, ShieldCheck } from 'lucide-react';
import { scheduleImagingAction, updateImagingResultAction } from './actions';
import Link from 'next/link';

type ImagingResult = {
  id: number;
  procedureName: string;
  resultText: string | null;
  status: string;
  priority: string;
  scheduledDate: Date | null;
  dateRequested: Date;
  dateCompleted: Date | null;
  validatedBy: string | null;
  reportUrl: string | null;
  patient: { id: number; firstName: string; lastName: string; dob: string; gender: string };
  doctor: { id: number; name: string };
};

export default function RadiologyClient({ initialImagingResults }: { initialImagingResults: ImagingResult[] }) {
  const [activeTab, setActiveTab] = useState<'Pending' | 'Scheduled' | 'Completed' | 'All'>('Pending');
  
  const [selectedImage, setSelectedImage] = useState<ImagingResult | null>(null);
  const [modalType, setModalType] = useState<'Schedule' | 'Upload' | 'View' | null>(null);

  const [scheduledDate, setScheduledDate] = useState('');
  const [resultText, setResultText] = useState('');
  const [validatedBy, setValidatedBy] = useState('');
  const [fileName, setFileName] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const fileInputRef = useRef<HTMLInputElement>(null);

  const filteredImaging = initialImagingResults.filter(img => 
    activeTab === 'All' ? true : img.status === activeTab
  );

  const openScheduleModal = (img: ImagingResult) => {
    setSelectedImage(img);
    setScheduledDate('');
    setModalType('Schedule');
  };

  const openUploadModal = (img: ImagingResult) => {
    setSelectedImage(img);
    setResultText(img.resultText || '');
    setValidatedBy(img.validatedBy || '');
    setModalType('Upload');
  };

  const openViewModal = (img: ImagingResult) => {
    setSelectedImage(img);
    setModalType('View');
  };

  const closeModal = () => {
    setSelectedImage(null);
    setModalType(null);
    setResultText('');
    setValidatedBy('');
    setScheduledDate('');
    setFileName(null);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setFileName(file.name);
    }
  };

  const handleScheduleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedImage || !scheduledDate) return;

    setIsSubmitting(true);
    try {
      await scheduleImagingAction(selectedImage.id, new Date(scheduledDate));
      window.location.reload();
    } catch (err) {
      console.error(err);
      alert('Failed to schedule procedure.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleUploadSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedImage || !resultText.trim() || !validatedBy.trim()) {
      alert("Please ensure both diagnostic findings and validation signature are provided.");
      return;
    }

    setIsSubmitting(true);
    try {
      const mockFileUrl = fileName ? `/uploads/radiology/${fileName}` : null;
      await updateImagingResultAction(selectedImage.id, resultText, validatedBy, mockFileUrl);
      window.location.reload();
    } catch (err) {
      console.error(err);
      alert('Failed to save imaging result.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <>
      <div className="flex border-b border-gray-200 mb-6 space-x-2">
        {['Pending', 'Scheduled', 'Completed', 'All'].map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab as any)}
            className={`px-4 py-2 border-b-2 text-sm font-medium transition-colors ${
              activeTab === tab
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            {tab}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {filteredImaging.length === 0 ? (
          <div className="col-span-full py-12 text-center bg-white rounded-xl shadow-sm ring-1 ring-gray-200">
            <Radiation className="mx-auto h-12 w-12 text-gray-300" />
            <h3 className="mt-2 text-sm font-semibold text-gray-900">No {activeTab.toLowerCase()} radiology requests found.</h3>
          </div>
        ) : (
          filteredImaging.map((img) => (
            <div key={img.id} className="bg-white overflow-hidden shadow-sm rounded-xl ring-1 ring-gray-200 flex flex-col">
              <div className="p-5 flex-1 border-b border-gray-100">
                <div className="flex items-center justify-between mb-4">
                  <span className={`inline-flex items-center rounded-md px-2 py-1 text-xs font-medium ring-1 ring-inset ${
                    img.status === 'Completed' ? 'bg-green-50 text-green-700 ring-green-600/20' : 
                    img.status === 'Scheduled' ? 'bg-blue-50 text-blue-700 ring-blue-600/20' : 'bg-yellow-50 text-yellow-800 ring-yellow-600/20'
                  }`}>
                    {img.status === 'Completed' ? <CheckCircle className="w-3 h-3 mr-1" /> : 
                     img.status === 'Scheduled' ? <CalendarIcon className="w-3 h-3 mr-1" /> : <Clock className="w-3 h-3 mr-1" />}
                    {img.status}
                  </span>
                  <span className="text-xs text-gray-500">
                    Req: {new Date(img.dateRequested).toLocaleDateString()}
                  </span>
                </div>
                <div className="flex items-start justify-between">
                  <h3 className="text-lg font-bold text-gray-900 mb-2">{img.procedureName}</h3>
                  {img.priority !== 'Routine' && (
                    <span className={`inline-flex items-center rounded-md px-2 py-0.5 text-xs font-bold ring-1 ring-inset uppercase ${
                      img.priority === 'Emergency' ? 'bg-red-50 text-red-700 ring-red-600/20 animate-pulse' : 'bg-orange-50 text-orange-700 ring-orange-600/20'
                    }`}>
                      {img.priority}
                    </span>
                  )}
                </div>
                
                <div className="space-y-1 text-sm text-gray-600">
                  <p><span className="font-medium text-gray-900">Patient:</span> <Link href={`/patients/${img.patient.id}`} className="hover:underline text-blue-600">{img.patient.firstName} {img.patient.lastName}</Link></p>
                  <p><span className="font-medium text-gray-900">Requested by:</span> Dr. {img.doctor.name}</p>
                  {img.status === 'Scheduled' && img.scheduledDate && (
                    <p className="mt-2 text-blue-600 font-medium">When: {new Date(img.scheduledDate).toLocaleString()}</p>
                  )}
                </div>
              </div>
              <div className="bg-gray-50 px-5 py-3 flex flex-col gap-2">
                {img.status === 'Pending' && (
                  <button onClick={() => openScheduleModal(img)} className="w-full flex items-center justify-center rounded-md bg-blue-600 px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-blue-500">
                    <CalendarIcon className="h-4 w-4 mr-2" /> Schedule Procedure
                  </button>
                )}
                
                {img.status === 'Scheduled' && (
                  <button onClick={() => openUploadModal(img)} className="w-full flex items-center justify-center rounded-md bg-blue-600 px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-blue-500">
                    <UploadCloud className="h-4 w-4 mr-2" /> Upload Report & Share
                  </button>
                )}

                {img.status === 'Completed' && (
                  <button onClick={() => openViewModal(img)} className="w-full flex items-center justify-center rounded-md bg-white px-3 py-2 text-sm font-semibold text-gray-700 shadow-sm ring-1 ring-inset ring-gray-300 hover:bg-gray-100">
                    <ShieldCheck className="h-4 w-4 mr-2" /> View Final Report
                  </button>
                )}
              </div>
            </div>
          ))
        )}
      </div>

      {/* Schedule Modal */}
      {modalType === 'Schedule' && selectedImage && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="fixed inset-0 bg-gray-900/50" onClick={closeModal} />
          <div className="relative bg-white rounded-lg shadow-xl w-full max-w-md p-6">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-lg font-bold text-gray-900">Schedule Procedure</h2>
              <button onClick={closeModal} className="text-gray-500 hover:text-gray-700"><X className="h-5 w-5" /></button>
            </div>
            <form onSubmit={handleScheduleSubmit}>
              <p className="text-sm text-gray-600 mb-4">Select date and time for <strong>{selectedImage.procedureName}</strong> for patient {selectedImage.patient.firstName}.</p>
              <input
                type="datetime-local"
                required
                value={scheduledDate}
                onChange={e => setScheduledDate(e.target.value)}
                className="block w-full rounded-md border-0 py-1.5 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 focus:ring-2 focus:ring-inset focus:ring-blue-600 sm:text-sm sm:leading-6"
              />
              <div className="mt-6 flex justify-end gap-3">
                <button type="button" onClick={closeModal} className="px-4 py-2 text-sm text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50">Cancel</button>
                <button type="submit" disabled={isSubmitting} className="px-4 py-2 text-sm text-white bg-blue-600 rounded-md hover:bg-blue-500 disabled:opacity-50">
                  {isSubmitting ? 'Scheduling...' : 'Confirm Schedule'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Upload/View Modal */}
      {(modalType === 'Upload' || modalType === 'View') && selectedImage && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="fixed inset-0 bg-gray-900/50" onClick={closeModal} />
          <div className="relative bg-white rounded-lg shadow-xl w-full max-w-2xl p-6">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold text-gray-900">
                {modalType === 'Upload' ? 'Upload Diagnostic Report' : 'Radiology Report'}
              </h2>
              <button onClick={closeModal} className="text-gray-500 hover:text-gray-700"><X className="h-5 w-5" /></button>
            </div>
            
            <div className="mb-4 text-sm text-gray-700 grid grid-cols-2 gap-4 bg-gray-50 p-4 rounded-lg border border-gray-100">
              <div><span className="font-semibold">Procedure:</span> {selectedImage.procedureName}</div>
              <div><span className="font-semibold">Patient:</span> {selectedImage.patient.firstName} {selectedImage.patient.lastName}</div>
              <div><span className="font-semibold">Doctor:</span> Dr. {selectedImage.doctor.name}</div>
              <div><span className="font-semibold">Requested:</span> {new Date(selectedImage.dateRequested).toLocaleDateString()}</div>
            </div>
            
            <form onSubmit={handleUploadSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Diagnostic Findings / Impression</label>
                {modalType === 'Upload' ? (
                  <textarea
                    required
                    rows={6}
                    value={resultText}
                    onChange={(e) => setResultText(e.target.value)}
                    placeholder="Enter the detailed diagnostic findings here..."
                    className="block w-full rounded-md border-0 py-1.5 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 focus:ring-2 focus:ring-inset focus:ring-blue-600 sm:text-sm sm:leading-6 font-mono"
                  />
                ) : (
                  <div className="w-full rounded-md border border-gray-200 bg-gray-50 p-4 text-gray-800 whitespace-pre-wrap font-mono min-h-[150px]">
                    {selectedImage.resultText || 'No diagnostic findings recorded.'}
                  </div>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Radiologist Signature</label>
                {modalType === 'Upload' ? (
                  <input
                    required
                    type="text"
                    value={validatedBy}
                    onChange={(e) => setValidatedBy(e.target.value)}
                    placeholder="E.g. Dr. Jane Smith, Lead Radiologist"
                    className="block w-full rounded-md border-0 py-1.5 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 focus:ring-2 focus:ring-inset focus:ring-blue-600 sm:text-sm sm:leading-6"
                  />
                ) : (
                  <div className="w-full rounded-md border border-gray-200 bg-gray-50 p-2 text-gray-800 font-semibold">
                    ✓ {selectedImage.validatedBy || 'Signature Missing'}
                  </div>
                )}
              </div>
              
              {modalType === 'Upload' ? (
                <div className="flex items-center pt-2">
                  <button 
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="flex items-center text-sm font-medium text-blue-600 hover:text-blue-500 border border-dashed border-blue-300 p-2 rounded-md bg-blue-50"
                  >
                    <UploadCloud className="h-4 w-4 mr-2" />
                    Attach Scan Imagery / PDF
                  </button>
                  <input type="file" className="hidden" ref={fileInputRef} onChange={handleFileUpload} />
                  {fileName && <span className="ml-3 text-xs text-gray-500 font-medium">Selected: {fileName}</span>}
                </div>
              ) : (
                selectedImage.reportUrl && (
                  <div className="text-sm pt-2">
                    <span className="font-medium text-gray-700">Attached Scan:</span>
                    <a href={selectedImage.reportUrl} target="_blank" rel="noopener noreferrer" className="ml-2 text-blue-600 hover:underline inline-flex items-center">
                      <FileText className="h-4 w-4 mr-1"/> View DICOM/PDF
                    </a>
                  </div>
                )
              )}

              <div className="pt-6 flex justify-end gap-3 border-t border-gray-100">
                <button type="button" onClick={closeModal} className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50">
                  Close
                </button>
                {modalType === 'Upload' && (
                  <button type="submit" disabled={isSubmitting} className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-500 disabled:opacity-50 flex items-center">
                    <CheckCircle className="h-4 w-4 mr-2" /> Complete & Share with Physician
                  </button>
                )}
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
