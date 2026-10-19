'use client';

import { useState, useRef } from 'react';
import {
  FlaskConical, FileText, CheckCircle, Clock, UploadCloud, X,
  Download, ShieldCheck, AlertTriangle,
} from 'lucide-react';
import { updateLabResultAction } from './actions';
import Link from 'next/link';

type LabResult = {
  id: number;
  testName: string;
  result: string | null;
  status: string;
  priority: string;
  dateRequested: Date;
  dateCompleted: Date | null;
  validatedBy: string | null;
  reportUrl: string | null;
  patient: { id: number; firstName: string; lastName: string; dob: string; gender: string };
  doctor: { id: number; name: string };
};

type Toast = { msg: string; kind: 'success' | 'error' };

// Real download endpoint — returns the document with Content-Disposition: attachment,
// which is what makes the save dialog appear reliably (even inside the embedded preview).
const docHref = (kind: 'request' | 'report', id: number) =>
  `/api/laboratory/download?kind=${kind}&id=${id}`;

export default function LaboratoryClient({ initialLabResults }: { initialLabResults: LabResult[] }) {
  const [activeTab, setActiveTab] = useState<'Pending' | 'Completed' | 'All'>('Pending');
  const [selectedLab, setSelectedLab] = useState<LabResult | null>(null);
  const [resultText, setResultText] = useState('');
  const [validatedBy, setValidatedBy] = useState('');
  const [fileName, setFileName] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [toast, setToast] = useState<Toast | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const flashToast = (msg: string, kind: Toast['kind'] = 'success') => {
    if (toastTimer.current) clearTimeout(toastTimer.current);
    setToast({ msg, kind });
    toastTimer.current = setTimeout(() => setToast(null), 2600);
  };

  const filteredLabs = initialLabResults.filter(lab =>
    activeTab === 'All' ? true : lab.status === activeTab
  );

  const openResultModal = (lab: LabResult) => {
    setSelectedLab(lab);
    setResultText(lab.result || '');
    setValidatedBy(lab.validatedBy || '');
  };

  const closeModal = () => {
    setSelectedLab(null);
    setResultText('');
    setValidatedBy('');
    setFileName(null);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) setFileName(file.name);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedLab || !resultText.trim() || !validatedBy.trim()) {
      flashToast('Result text and a validation signature are both required.', 'error');
      return;
    }

    setIsSubmitting(true);
    try {
      const mockFileUrl = fileName ? `/uploads/labs/${fileName}` : null;
      await updateLabResultAction(selectedLab.id, resultText, validatedBy, mockFileUrl);
      flashToast('Result validated and released. Reloading…', 'success');
      setTimeout(() => window.location.reload(), 600);
    } catch (err) {
      console.error(err);
      flashToast('Could not save the lab result. Please try again.', 'error');
      setIsSubmitting(false);
    }
  };

  const toastCfg = toast
    ? (toast.kind === 'success'
        ? { ring: 'ring-emerald-300/60', bg: 'bg-slate-900', bar: 'bg-emerald-400', Icon: CheckCircle, iconColor: 'text-emerald-400' }
        : { ring: 'ring-rose-400/70',   bg: 'bg-slate-900', bar: 'bg-rose-400',   Icon: AlertTriangle, iconColor: 'text-rose-400' })
    : null;
  const ToastIcon = toastCfg?.Icon ?? CheckCircle;

  return (
    <>
      {/* Keyframes for the toast's entrance + the auto-dismiss progress bar. */}
      <style>{`
        @keyframes lab-toast-in { from { opacity: 0; transform: translateY(10px) scale(.97); } to { opacity: 1; transform: translateY(0) scale(1); } }
        @keyframes lab-toast-bar { from { transform: scaleX(1); } to { transform: scaleX(0); } }
      `}</style>

      {/* Confirmation toast — gives perceptible feedback that a download / action fired. */}
      <div className="fixed bottom-6 right-6 z-[60] pointer-events-none">
        {toast && toastCfg && (
          <div
            key={toast.msg}
            className={`pointer-events-auto relative overflow-hidden rounded-xl ${toastCfg.bg} ring-1 ${toastCfg.ring} shadow-2xl shadow-black/30 px-4 py-3 pr-5 min-w-[260px] max-w-sm [animation:lab-toast-in_.25s_ease-out]`}
          >
            <div className="flex items-start gap-3">
              <ToastIcon className={`h-5 w-5 mt-0.5 shrink-0 ${toastCfg.iconColor}`} />
              <p className="text-sm font-medium text-white leading-snug">{toast.msg}</p>
            </div>
            <span
              className={`absolute left-0 bottom-0 h-0.5 w-full origin-left ${toastCfg.bar} [animation:lab-toast-bar_2.6s_linear_forwards]`}
            />
          </div>
        )}
      </div>

      <div className="flex border-b border-gray-200 mb-6">
        {(['Pending', 'Completed', 'All'] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-4 py-2 border-b-2 text-sm font-medium transition-colors ${
              activeTab === tab
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            {tab} Requests
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {filteredLabs.length === 0 ? (
          <div className="col-span-full py-12 text-center bg-white rounded-xl shadow-sm ring-1 ring-gray-200">
            <FlaskConical className="mx-auto h-12 w-12 text-gray-300" />
            <h3 className="mt-2 text-sm font-semibold text-gray-900">No {activeTab.toLowerCase()} lab requests found.</h3>
          </div>
        ) : (
          filteredLabs.map((lab) => (
            <div key={lab.id} className="bg-white overflow-hidden shadow-sm rounded-xl ring-1 ring-gray-200 flex flex-col hover:ring-gray-300 hover:shadow-md transition-all">
              <div className="p-5 flex-1 border-b border-gray-100">
                <div className="flex items-center justify-between mb-4">
                  <span className={`inline-flex items-center rounded-md px-2 py-1 text-xs font-medium ring-1 ring-inset ${
                    lab.status === 'Completed' ? 'bg-green-50 text-green-700 ring-green-600/20' : 'bg-yellow-50 text-yellow-800 ring-yellow-600/20'
                  }`}>
                    {lab.status === 'Completed' ? <CheckCircle className="w-3 h-3 mr-1" /> : <Clock className="w-3 h-3 mr-1" />}
                    {lab.status}
                  </span>
                  <span className="text-xs text-gray-500">
                    {new Date(lab.dateRequested).toLocaleDateString()}
                  </span>
                </div>
                <div className="flex items-start justify-between">
                  <h3 className="text-lg font-bold text-gray-900 mb-2">{lab.testName}</h3>
                  {lab.priority !== 'Routine' && (
                    <span className={`inline-flex items-center rounded-md px-2 py-0.5 text-xs font-bold ring-1 ring-inset uppercase ${
                      lab.priority === 'Emergency' ? 'bg-red-50 text-red-700 ring-red-600/20 animate-pulse' : 'bg-orange-50 text-orange-700 ring-orange-600/20'
                    }`}>
                      {lab.priority}
                    </span>
                  )}
                </div>

                <div className="space-y-1 text-sm text-gray-600">
                  <p><span className="font-medium text-gray-900">Patient:</span> <Link href={`/patients/${lab.patient.id}`} className="hover:underline text-blue-600">{lab.patient.firstName} {lab.patient.lastName}</Link></p>
                  <p><span className="font-medium text-gray-900">Requested by:</span> Dr. {lab.doctor.name}</p>
                </div>
              </div>

              <div className="bg-gray-50 px-5 py-3 flex flex-col gap-2">
                {lab.status === 'Pending' ? (
                  <>
                    {/* Real link → real download. onClick only adds the confirmation toast. */}
                    <a
                      href={docHref('request', lab.id)}
                      onClick={() => flashToast(`Request form “${lab.testName}” downloaded`)}
                      className="w-full flex items-center justify-center rounded-md bg-white px-3 py-2 text-sm font-semibold text-gray-700 shadow-sm ring-1 ring-inset ring-gray-300 hover:bg-gray-100 transition-all duration-150 hover:-translate-y-0.5 active:translate-y-0 active:scale-[0.98]"
                    >
                      <Download className="h-4 w-4 mr-2" /> Download Request
                    </a>
                    <button
                      onClick={() => openResultModal(lab)}
                      className="w-full flex items-center justify-center rounded-md bg-blue-600 px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-blue-500 transition-all duration-150 hover:-translate-y-0.5 active:translate-y-0 active:scale-[0.98]"
                    >
                      <UploadCloud className="h-4 w-4 mr-2" /> Record &amp; Upload Result
                    </button>
                  </>
                ) : (
                  <>
                    <a
                      href={docHref('report', lab.id)}
                      onClick={() => flashToast(`Validated report “${lab.testName}” downloaded`)}
                      className="w-full flex items-center justify-center rounded-md bg-green-600 px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-green-500 transition-all duration-150 hover:-translate-y-0.5 active:translate-y-0 active:scale-[0.98]"
                    >
                      <FileText className="h-4 w-4 mr-2" /> Generate Final Report
                    </a>
                    <button
                      onClick={() => openResultModal(lab)}
                      className="w-full flex items-center justify-center rounded-md bg-white px-3 py-2 text-sm font-semibold text-gray-700 shadow-sm ring-1 ring-inset ring-gray-300 hover:bg-gray-100 transition-all duration-150 hover:-translate-y-0.5 active:translate-y-0 active:scale-[0.98]"
                    >
                      <ShieldCheck className="h-4 w-4 mr-2" /> View Validation
                    </button>
                  </>
                )}
              </div>
            </div>
          ))
        )}
      </div>

      {selectedLab && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="fixed inset-0 bg-gray-900/50" onClick={closeModal} />
          <div className="relative bg-white rounded-lg shadow-xl w-full max-w-2xl p-6">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold text-gray-900">
                {selectedLab.status === 'Pending' ? 'Upload Lab Result' : 'View Lab Result'}
              </h2>
              <button onClick={closeModal} className="text-gray-500 hover:text-gray-700">
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="mb-4 text-sm text-gray-700 grid grid-cols-2 gap-4 bg-gray-50 p-4 rounded-lg">
              <div><span className="font-semibold">Test Name:</span> {selectedLab.testName}</div>
              <div><span className="font-semibold">Patient:</span> {selectedLab.patient.firstName} {selectedLab.patient.lastName}</div>
              <div><span className="font-semibold">Doctor:</span> Dr. {selectedLab.doctor.name}</div>
              <div><span className="font-semibold">Date Requested:</span> {new Date(selectedLab.dateRequested).toLocaleDateString()}</div>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Result Data &amp; Values</label>
                {selectedLab.status === 'Pending' ? (
                  <textarea
                    required
                    rows={6}
                    value={resultText}
                    onChange={(e) => setResultText(e.target.value)}
                    placeholder="Enter the lab findings and normal ranges here..."
                    className="block w-full rounded-md border-0 py-1.5 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 focus:ring-2 focus:ring-inset focus:ring-blue-600 sm:text-sm sm:leading-6 font-mono"
                  />
                ) : (
                  <div className="w-full rounded-md border border-gray-200 bg-gray-50 p-4 text-gray-800 whitespace-pre-wrap font-mono min-h-[150px]">
                    {selectedLab.result || 'No result data provided.'}
                  </div>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Validated By (Technologist Name)</label>
                {selectedLab.status === 'Pending' ? (
                  <input
                    required
                    type="text"
                    value={validatedBy}
                    onChange={(e) => setValidatedBy(e.target.value)}
                    placeholder="E.g. Tech. Sarah Johnson"
                    className="block w-full rounded-md border-0 py-1.5 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 focus:ring-2 focus:ring-inset focus:ring-blue-600 sm:text-sm sm:leading-6"
                  />
                ) : (
                  <div className="w-full rounded-md border border-gray-200 bg-gray-50 p-2 text-gray-800 font-semibold">
                    ✓ {selectedLab.validatedBy || 'Validation Signature Missing'}
                  </div>
                )}
              </div>

              {selectedLab.status === 'Pending' ? (
                <div className="flex items-center">
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="flex items-center text-sm font-medium text-blue-600 hover:text-blue-500"
                  >
                    <UploadCloud className="h-4 w-4 mr-1" />
                    Upload Raw Machine File (Optional)
                  </button>
                  <input
                    type="file"
                    className="hidden"
                    ref={fileInputRef}
                    onChange={handleFileUpload}
                  />
                  {fileName && <span className="ml-3 text-xs text-gray-500">Selected: {fileName}</span>}
                </div>
              ) : (
                selectedLab.reportUrl && (
                  <div className="text-sm">
                    <span className="font-medium text-gray-700">Attached File:</span>
                    <a href={selectedLab.reportUrl} target="_blank" rel="noopener noreferrer" className="ml-2 text-blue-600 hover:underline">
                      View Raw File
                    </a>
                  </div>
                )
              )}

              <div className="pt-4 flex justify-end gap-3 border-t border-gray-100">
                <button type="button" onClick={closeModal} className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50">
                  Close
                </button>
                {selectedLab.status === 'Pending' && (
                  <button type="submit" disabled={isSubmitting} className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-500 disabled:opacity-50">
                    {isSubmitting ? 'Saving...' : 'Complete Test & Save Result'}
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
