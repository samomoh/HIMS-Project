'use client';

import { useState, useRef } from 'react';
import {
  Siren, UserPlus, AlertOctagon, Activity, Clock, ShieldCheck, X,
  FileSpreadsheet, Upload, Download, CheckCircle2, AlertTriangle, Info, Loader2,
} from 'lucide-react';
import Link from 'next/link';
import { createTriageAction, dischargeEmergencyAction } from './actions';

type Triage = any;
type Patient = any;
type Staff = any;

type Banner = {
  kind: 'success' | 'error' | 'warning' | 'info';
  title: string;
  body?: string;
  warnings?: string[];
  stats?: { labs?: number; imaging?: number };
};

const triageColors: Record<string, string> = {
  'Resuscitation': 'bg-red-600 text-white animate-pulse',
  'Emergent':        'bg-orange-500 text-white',
  'Urgent':          'bg-yellow-400 text-yellow-900',
  'Less Urgent':     'bg-green-500 text-white',
  'Non-Urgent':      'bg-blue-500 text-white',
};

const bannerStyles: Record<Banner['kind'], { ring: string; bg: string; accent: string; icon: typeof CheckCircle2; iconColor: string }> = {
  success: { ring: 'ring-emerald-200',  bg: 'bg-emerald-50',  accent: 'bg-emerald-500', icon: CheckCircle2,   iconColor: 'text-emerald-600' },
  error:   { ring: 'ring-rose-300',     bg: 'bg-rose-50',     accent: 'bg-rose-500 animate-pulse', icon: AlertTriangle, iconColor: 'text-rose-600' },
  warning: { ring: 'ring-amber-200',    bg: 'bg-amber-50',    accent: 'bg-amber-500', icon: AlertTriangle,  iconColor: 'text-amber-600' },
  info:    { ring: 'ring-sky-200',      bg: 'bg-sky-50',      accent: 'bg-sky-500', icon: Info,             iconColor: 'text-sky-600' },
};

export default function EmergencyClient({
  initialTriage,
  patients,
  staffList,
}: {
  initialTriage: Triage[];
  patients: Patient[];
  staffList: Staff[];
}) {
  const [activeTab, setActiveTab] = useState<'Active' | 'History' | 'External Records'>('Active');

  const [triageModalOpen, setTriageModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isUploadingLabReport, setIsUploadingLabReport] = useState(false);
  const [externalLabReport, setExternalLabReport] = useState({
    patientId: patients.length > 0 ? String(patients[0].id) : '',
    testName: '',
    reportDate: '',
    notes: '',
  });
  const [formData, setFormData] = useState({
    staffId: staffList.length > 0 ? staffList[0].id : 0,
    patientType: 'registered' as 'registered' | 'unidentified',
    patientId: patients.length > 0 ? patients[0].id : 0,
    unidentifiedName: '',
    triageLevel: 'Urgent',
    chiefComplaint: '',
    mechanismOfInjury: '',
    orderStatLabs: true,
    orderStatImaging: false,
  });

  // Inline status banner (replaces blocking alert/confirm dialogs).
  const [banner, setBanner] = useState<Banner | null>(null);
  const bannerTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const showBanner = (b: Banner, autoMs?: number) => {
    if (bannerTimer.current) clearTimeout(bannerTimer.current);
    setBanner(b);
    const ms = autoMs ?? (b.kind === 'success' || b.kind === 'info' ? 6500 : 0);
    if (ms > 0) bannerTimer.current = setTimeout(() => setBanner(null), ms);
  };
  const dismissBanner = () => {
    if (bannerTimer.current) clearTimeout(bannerTimer.current);
    setBanner(null);
  };

  const activeCases  = initialTriage.filter((t: Triage) => t.status === 'Active');
  const historyCases = initialTriage.filter((t: Triage) => t.status !== 'Active');

  const fileInputRef = useRef<HTMLInputElement>(null);
  const externalLabFileInputRef = useRef<HTMLInputElement>(null);

  const downloadExternalTemplate = () => {
    const csvContent = "patientId,recordType,date,description,resultOrFindings\n1,Diagnosis,2023-05-12,Prior Hypertension,Patient taking Lisinopril 10mg\n1,Lab,2023-06-01,CBC from General Hosp,WBC elevated at 14.2";
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'er_external_records_template.csv';
    a.click();
    window.URL.revokeObjectURL(url);
  };

  const handleExternalUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsSubmitting(true);
    const reader = new FileReader();
    reader.onload = async (event) => {
      const text = event.target?.result as string;
      const lines = text.split('\n').filter(l => l.trim().length > 0);
      if (lines.length < 2) {
        showBanner({ kind: 'error', title: 'CSV file is empty', body: 'The uploaded file has no data rows. Add a header row and at least one record, then try again.' });
        setIsSubmitting(false);
        return;
      }

      const headers = lines[0].toLowerCase().split(',').map(h => h.trim());
      const pIdIdx    = headers.indexOf('patientid');
      const typeIdx   = headers.indexOf('recordtype');
      const dateIdx   = headers.indexOf('date');
      const descIdx   = headers.indexOf('description');
      const resultIdx = headers.indexOf('resultorfindings');

      if (pIdIdx === -1 || typeIdx === -1 || descIdx === -1 || resultIdx === -1) {
        showBanner({
          kind: 'error',
          title: 'CSV header mismatch',
          body: 'Required columns missing. The header must include: patientId, recordType, description, resultOrFindings.',
        });
        setIsSubmitting(false);
        return;
      }

      const recordsList = [];
      for (let i = 1; i < lines.length; i++) {
        const match = lines[i].match(/(".*?"|[^",\s]+)(?=\s*,|\s*$)/g);
        if (!match) continue;
        const cols = match.map(c => c.replace(/^"|"$/g, '').trim());
        if (cols.length >= 4) {
          recordsList.push({
            patientId: parseInt(cols[pIdIdx], 10),
            recordType: cols[typeIdx],
            date: dateIdx !== -1 && cols[dateIdx] ? cols[dateIdx] : new Date().toISOString().split('T')[0],
            description: cols[descIdx],
            resultOrFindings: cols[resultIdx],
          });
        }
      }

      if (recordsList.length === 0) {
        showBanner({ kind: 'warning', title: 'No rows parsed', body: 'The CSV header looked valid but no data rows matched. Check quoting and column order.' });
        setIsSubmitting(false);
        return;
      }

      try {
        const response = await fetch('/api/emergency/bulk-records', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ records: recordsList, staffId: formData.staffId || 1 }),
        });
        if (response.ok) {
          showBanner({ kind: 'success', title: `${recordsList.length} external record(s) imported`, body: 'External diagnostics and history rows are now attached to the matching patient charts.' }, 5000);
          setTimeout(() => window.location.reload(), 900);
        } else {
          showBanner({ kind: 'error', title: 'Import rejected by server', body: `HTTP ${response.status} — some patient IDs in the CSV may not exist in this hospital.` });
        }
      } catch (err) {
        console.error(err);
        showBanner({ kind: 'error', title: 'Network error during import', body: (err as Error)?.message || 'Could not reach the bulk-import endpoint.' });
      }
      setIsSubmitting(false);
    };
    reader.readAsText(file);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleExternalLabReportUpload = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formElement = e.currentTarget;
    const file = externalLabFileInputRef.current?.files?.[0];
    if (!file) {
      showBanner({ kind: 'error', title: 'Select a report file', body: 'Choose a PDF or image of the previous lab result.' });
      return;
    }
    if (file.size > 15 * 1024 * 1024) {
      showBanner({ kind: 'error', title: 'Report file is too large', body: 'The maximum upload size is 15 MB.' });
      return;
    }

    setIsUploadingLabReport(true);
    const payload = new FormData();
    payload.set('patientId', externalLabReport.patientId);
    payload.set('testName', externalLabReport.testName);
    payload.set('reportDate', externalLabReport.reportDate);
    payload.set('notes', externalLabReport.notes);
    payload.set('file', file);
    try {
      const response = await fetch('/api/emergency/external-lab', { method: 'POST', body: payload });
      const result = await response.json().catch(() => null);
      if (!response.ok) {
        showBanner({ kind: 'error', title: 'Report upload failed', body: result?.error || `Upload could not be saved (HTTP ${response.status}).` });
        return;
      }
      showBanner({ kind: 'success', title: 'Previous lab result uploaded', body: 'The report is now attached to the patient chart.' }, 5000);
      formElement.reset();
      setExternalLabReport({ patientId: patients.length > 0 ? String(patients[0].id) : '', testName: '', reportDate: '', notes: '' });
      setTimeout(() => window.location.reload(), 900);
    } catch (error) {
      console.error(error);
      showBanner({ kind: 'error', title: 'Report upload failed', body: 'Could not reach the upload service. Please try again.' });
    } finally {
      setIsUploadingLabReport(false);
    }
  };

  const openTriageModal = () => {
    setFormData({
      staffId: staffList.length > 0 ? staffList[0].id : 0,
      patientType: 'registered',
      patientId: patients.length > 0 ? patients[0].id : 0,
      unidentifiedName: '',
      triageLevel: 'Urgent',
      chiefComplaint: '',
      mechanismOfInjury: '',
      orderStatLabs: true,
      orderStatImaging: false,
    });
    dismissBanner();
    setTriageModalOpen(true);
  };

  const handleTriageSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    dismissBanner();

    // Client-side sanity checks — surface problems inline instead of as a native alert.
    const complaint = formData.chiefComplaint.trim();
    if (!complaint) {
      showBanner({ kind: 'error', title: 'Missing chief complaint', body: 'The ER cannot open a triage row without a presenting complaint.' });
      return;
    }
    if (formData.patientType === 'unidentified' && !formData.unidentifiedName.trim()) {
      showBanner({ kind: 'error', title: 'Missing trauma alias', body: 'Provide an alias such as “John Doe – Bay 3” so the team can track the patient.' });
      return;
    }
    if (formData.patientType === 'registered' && (!formData.patientId || formData.patientId <= 0)) {
      showBanner({ kind: 'error', title: 'No patient selected', body: 'Pick a registered patient from the list, or switch to Trauma Code.' });
      return;
    }

    setIsSubmitting(true);
    try {
      const result = await createTriageAction({
        staffId: formData.staffId,
        triageLevel: formData.triageLevel,
        chiefComplaint: complaint,
        mechanismOfInjury: formData.mechanismOfInjury,
        patientType: formData.patientType,
        patientId: formData.patientType === 'registered' ? formData.patientId : undefined,
        unidentifiedName: formData.unidentifiedName,
        orderStatLabs: formData.orderStatLabs,
        orderStatImaging: formData.orderStatImaging,
      });

      if (result.success) {
        showBanner({
          kind: 'success',
          title: result.message,
          warnings: result.warnings,
          stats: { labs: result.statLabsQueued, imaging: result.statImagingQueued },
        }, 8000);
        // Safety net in case the reload stalls — re-enable the form so the user is never stuck.
        setTimeout(() => setIsSubmitting(false), 4000);
        setTimeout(() => window.location.reload(), 1400);
      } else {
        showBanner({ kind: 'error', title: 'Triage not saved', body: result.message, warnings: result.warnings });
        setIsSubmitting(false);
      }
    } catch (err) {
      console.error(err);
      showBanner({
        kind: 'error',
        title: 'Unexpected error while saving triage',
        body: (err as Error)?.message || 'The request failed before the server confirmed the record.',
      });
      setIsSubmitting(false);
    }
  };

  const handleDischarge = async (id: number, finalStatus: string) => {
    if (!confirm(`Mark triage #${id} as ${finalStatus}?`)) return;
    dismissBanner();
    try {
      const result = await dischargeEmergencyAction(id, finalStatus);
      if (result.success) {
        showBanner({ kind: 'success', title: result.message }, 4500);
        setTimeout(() => window.location.reload(), 700);
      } else {
        showBanner({ kind: 'error', title: 'Status not updated', body: result.message });
      }
    } catch (err) {
      console.error(err);
      showBanner({ kind: 'error', title: 'Could not update triage status', body: (err as Error)?.message || 'Unknown error.' });
    }
  };

  // Live preview of the trauma alias so the operator sees exactly what the board will print.
  const aliasPreview = (formData.unidentifiedName || '').trim();
  const isTraumaMode = formData.patientType === 'unidentified';

  const bannerCfg = banner ? bannerStyles[banner.kind] : null;
  const BannerIcon = bannerCfg?.icon ?? Info;

  return (
    <>
      {/* Floating status toast — sits above the modal so confirmations / errors are never hidden. */}
      <div
        aria-live="polite"
        className={`fixed top-4 right-4 z-[60] w-[min(420px,calc(100vw-2rem))] transition-all duration-300 ${
          banner ? 'opacity-100 translate-y-0 pointer-events-auto' : 'opacity-0 -translate-y-3 pointer-events-none'
        }`}
      >
        {banner && bannerCfg && (
          <div className={`relative overflow-hidden rounded-xl ring-1 ${bannerCfg.ring} ${bannerCfg.bg} shadow-xl shadow-black/10`}>
            <div className={`absolute left-0 top-0 bottom-0 w-1.5 ${bannerCfg.accent}`} />
            <div className="pl-5 pr-3 py-3 flex gap-3">
              <BannerIcon className={`h-5 w-5 mt-0.5 shrink-0 ${bannerCfg.iconColor}`} />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-bold text-gray-900">{banner.title}</p>
                {banner.body && <p className="mt-0.5 text-sm text-gray-700 leading-snug">{banner.body}</p>}
                {banner.stats && (banner.stats.labs || banner.stats.imaging) ? (
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    {!!banner.stats.labs && (
                      <span className="inline-flex items-center rounded bg-rose-100 px-2 py-0.5 text-[11px] font-semibold text-rose-800">
                        {banner.stats.labs} STAT lab(s) queued
                      </span>
                    )}
                    {!!banner.stats.imaging && (
                      <span className="inline-flex items-center rounded bg-rose-100 px-2 py-0.5 text-[11px] font-semibold text-rose-800">
                        {banner.stats.imaging} STAT imaging queued
                      </span>
                    )}
                  </div>
                ) : null}
                {banner.warnings && banner.warnings.length > 0 && (
                  <ul className="mt-2 space-y-1 border-t border-amber-200/70 pt-2">
                    {banner.warnings.map((w, i) => (
                      <li key={i} className="flex items-start gap-1.5 text-[12px] text-amber-900">
                        <AlertTriangle className="h-3.5 w-3.5 mt-0.5 shrink-0 text-amber-600" />
                        <span>{w}</span>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
              <button onClick={dismissBanner} className="text-gray-500 hover:text-gray-800 self-start" aria-label="Dismiss">
                <X className="h-4 w-4" />
              </button>
            </div>
          </div>
        )}
      </div>

      <div className="flex justify-between items-end mb-6">
        <div className="flex border-b border-gray-200 space-x-2">
          <button
            onClick={() => setActiveTab('Active')}
            className={`px-4 py-2 border-b-2 text-sm font-medium transition-colors flex items-center ${activeTab === 'Active' ? 'border-red-600 text-red-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}
          >
            <span className="relative flex h-2 w-2 mr-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-red-500" />
            </span>
            <Activity className="w-4 h-4 mr-1.5" /> Active Trauma Board
            <span className="ml-2 inline-flex items-center rounded-full bg-red-100 px-1.5 py-0.5 text-[11px] font-bold text-red-700">{activeCases.length}</span>
          </button>
          <button
            onClick={() => setActiveTab('History')}
            className={`px-4 py-2 border-b-2 text-sm font-medium transition-colors flex items-center ${activeTab === 'History' ? 'border-red-600 text-red-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}
          >
            <Clock className="w-4 h-4 mr-2" /> ER History
          </button>
          <button
            onClick={() => setActiveTab('External Records')}
            className={`px-4 py-2 border-b-2 text-sm font-medium transition-colors flex items-center ${activeTab === 'External Records' ? 'border-red-600 text-red-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}
          >
            <ShieldCheck className="w-4 h-4 mr-2" /> External Records Import
          </button>
        </div>
        <button
          onClick={openTriageModal}
          className="group relative flex items-center rounded-md bg-red-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-red-500 transition-all hover:shadow-md"
        >
          <span className="absolute inset-0 rounded-md ring-2 ring-red-300 opacity-0 group-hover:opacity-100 animate-pulse pointer-events-none" />
          <UserPlus className="h-4 w-4 mr-2" /> New Triage / Arrival
        </button>
      </div>

      <div className="space-y-4">
        {activeTab === 'External Records' ? (
          <div className="bg-white shadow-sm ring-1 ring-gray-200 rounded-xl overflow-hidden p-6">
            <h2 className="text-lg font-bold text-gray-900 mb-2">External Records Import</h2>
            <p className="text-sm text-gray-600 mb-6">Upload previous diagnostics, past medical history, and external lab results for registered patients to assist with ER triage and treatment decisions.</p>

            <form onSubmit={handleExternalLabReportUpload} className="mb-8 rounded-xl border border-blue-100 bg-blue-50/50 p-5">
              <h3 className="text-base font-semibold text-gray-900">Upload previous lab result</h3>
              <p className="mt-1 text-sm text-gray-600">Attach a PDF or image to a patient&apos;s lab history. Accepted formats: PDF, JPEG, PNG, and WebP. Maximum file size: 15 MB.</p>
              <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <label htmlFor="externalLabPatient" className="block text-sm font-medium text-gray-900">Patient <span className="text-red-600">*</span></label>
                  <select id="externalLabPatient" required value={externalLabReport.patientId} onChange={(e) => setExternalLabReport({ ...externalLabReport, patientId: e.target.value })} className="mt-1 block w-full rounded-md border-0 bg-white py-2 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 focus:ring-2 focus:ring-inset focus:ring-blue-600 sm:text-sm">
                    {patients.length === 0 ? <option value="">No registered patients available</option> : patients.map((patient: Patient) => <option key={patient.id} value={patient.id}>{patient.firstName} {patient.lastName} · #{patient.id}</option>)}
                  </select>
                </div>
                <div>
                  <label htmlFor="externalLabTestName" className="block text-sm font-medium text-gray-900">Test name <span className="text-red-600">*</span></label>
                  <input id="externalLabTestName" required maxLength={244} value={externalLabReport.testName} onChange={(e) => setExternalLabReport({ ...externalLabReport, testName: e.target.value })} className="mt-1 block w-full rounded-md border-0 bg-white py-2 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 focus:ring-2 focus:ring-inset focus:ring-blue-600 sm:text-sm" placeholder="e.g. Complete Blood Count" />
                </div>
                <div>
                  <label htmlFor="externalLabReportDate" className="block text-sm font-medium text-gray-900">Report date <span className="text-gray-500">Optional</span></label>
                  <input id="externalLabReportDate" type="date" value={externalLabReport.reportDate} onChange={(e) => setExternalLabReport({ ...externalLabReport, reportDate: e.target.value })} className="mt-1 block w-full rounded-md border-0 bg-white py-2 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 focus:ring-2 focus:ring-inset focus:ring-blue-600 sm:text-sm" />
                </div>
                <div>
                  <label htmlFor="externalLabReportFile" className="block text-sm font-medium text-gray-900">Report file <span className="text-red-600">*</span></label>
                  <input id="externalLabReportFile" ref={externalLabFileInputRef} required type="file" accept=".pdf,.jpg,.jpeg,.png,.webp,application/pdf,image/jpeg,image/png,image/webp" className="mt-1 block w-full rounded-md border border-gray-300 bg-white text-sm text-gray-700 file:mr-3 file:border-0 file:bg-gray-100 file:px-3 file:py-2 file:font-medium" />
                </div>
                <div className="sm:col-span-2">
                  <label htmlFor="externalLabReportNotes" className="block text-sm font-medium text-gray-900">Notes <span className="text-gray-500">Optional</span></label>
                  <textarea id="externalLabReportNotes" rows={2} maxLength={5000} value={externalLabReport.notes} onChange={(e) => setExternalLabReport({ ...externalLabReport, notes: e.target.value })} className="mt-1 block w-full rounded-md border-0 bg-white py-2 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 focus:ring-2 focus:ring-inset focus:ring-blue-600 sm:text-sm" placeholder="Source facility or context for this report." />
                </div>
              </div>
              <div className="mt-4 flex justify-end">
                <button type="submit" disabled={isUploadingLabReport || patients.length === 0} className="inline-flex items-center rounded-md bg-blue-700 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-blue-600 disabled:cursor-not-allowed disabled:opacity-50">
                  <Upload className="mr-2 h-4 w-4" /> {isUploadingLabReport ? 'Uploading report…' : 'Upload lab report'}
                </button>
              </div>
            </form>

            <h3 className="text-base font-semibold text-gray-900">Bulk import with CSV</h3>
            <p className="mb-4 mt-1 text-sm text-gray-600">Continue to use the CSV option for structured external records.</p>
            <div className="flex flex-wrap gap-4">
              <button onClick={downloadExternalTemplate} className="flex items-center rounded-md bg-white px-4 py-2 text-sm font-semibold text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 hover:bg-gray-50">
                <FileSpreadsheet className="h-4 w-4 mr-2" /> Download CSV Template
              </button>
              <button
                onClick={() => fileInputRef.current?.click()}
                disabled={isSubmitting}
                className="flex items-center rounded-md bg-blue-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-blue-500 disabled:opacity-50"
              >
                <Upload className="h-4 w-4 mr-2" /> {isSubmitting ? 'Importing…' : 'Upload Populated CSV'}
              </button>
              <input type="file" accept=".csv" ref={fileInputRef} className="hidden" onChange={handleExternalUpload} />
            </div>

            <div className="mt-8 bg-blue-50 p-4 rounded-lg border border-blue-100">
              <h3 className="text-sm font-bold text-blue-900 mb-2">Template Instructions</h3>
              <ul className="list-disc pl-5 text-sm text-blue-800 space-y-1">
                <li><strong>patientId:</strong> Must correspond to a registered patient ID in the system.</li>
                <li><strong>recordType:</strong> Specify &quot;Lab&quot;, &quot;Diagnosis&quot;, or &quot;Imaging&quot;.</li>
                <li><strong>description:</strong> Short name of the test or condition (e.g., &quot;CBC&quot;, &quot;Hypertension&quot;).</li>
                <li><strong>resultOrFindings:</strong> The detailed result values or clinical notes.</li>
              </ul>
            </div>
          </div>
        ) : (activeTab === 'Active' ? activeCases : historyCases).length === 0 ? (
          <div className="py-12 text-center text-sm text-gray-500 bg-white rounded-xl shadow-sm ring-1 ring-gray-200 flex flex-col items-center">
            <ShieldCheck className="h-12 w-12 text-gray-300 mb-3" />
            No {activeTab.toLowerCase()} ER cases at the moment.
          </div>
        ) : (
          (activeTab === 'Active' ? activeCases : historyCases).map((triage: Triage) => (
            <div key={triage.id} className="bg-white overflow-hidden shadow-sm rounded-xl ring-1 ring-gray-200 flex flex-col lg:flex-row hover:ring-gray-300 transition-colors">
              <div className={`w-full lg:w-4 ${triageColors[triage.triageLevel]} shrink-0`} />

              <div className="p-5 flex-1 flex flex-col sm:flex-row gap-6 items-start sm:items-center">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <span className={`px-2 py-0.5 text-xs font-bold uppercase rounded ${triageColors[triage.triageLevel]}`}>
                      {triage.triageLevel}
                    </span>
                    <span className="text-xs text-gray-500 font-medium ml-2">Arrived: {new Date(triage.arrivalTime).toLocaleString()}</span>
                  </div>

                  <h3 className="text-xl font-bold text-gray-900 mt-2 flex items-center gap-2">
                    {triage.patient ? (
                      <Link href={`/patients/${triage.patient.id}`} className="hover:underline hover:text-blue-600">
                        {triage.patient.firstName} {triage.patient.lastName}
                      </Link>
                    ) : (
                      <span className="text-gray-700 italic flex items-center gap-2">
                        <span className="inline-flex items-center rounded bg-rose-100 px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-rose-700">Trauma Code</span>
                        {triage.unidentifiedName}
                      </span>
                    )}
                  </h3>

                  <p className="mt-2 text-sm text-gray-700"><span className="font-semibold text-gray-900">Chief Complaint:</span> {triage.chiefComplaint}</p>
                  {triage.mechanismOfInjury && (
                    <p className="mt-1 text-sm text-gray-700"><span className="font-semibold text-gray-900">Mechanism of Injury:</span> {triage.mechanismOfInjury}</p>
                  )}
                  <p className="mt-2 text-xs text-gray-500">Triaged by: {triage.staff.name}</p>
                </div>

                {activeTab === 'Active' && (
                  <div className="flex flex-col gap-2 shrink-0 w-full sm:w-48 border-t sm:border-t-0 sm:border-l border-gray-100 pt-4 sm:pt-0 sm:pl-4">
                    {triage.patient && (
                      <Link href={`/patients/${triage.patient.id}`} className="w-full text-center rounded-md bg-white px-3 py-2 text-sm font-semibold text-gray-700 shadow-sm ring-1 ring-inset ring-gray-300 hover:bg-gray-50">
                        Open Chart
                      </Link>
                    )}
                    <button onClick={() => handleDischarge(triage.id, 'Admitted')} className="w-full text-center rounded-md bg-purple-50 px-3 py-2 text-sm font-semibold text-purple-700 shadow-sm ring-1 ring-inset ring-purple-200 hover:bg-purple-100">
                      Admit to Ward
                    </button>
                    <button onClick={() => handleDischarge(triage.id, 'Discharged')} className="w-full text-center rounded-md bg-green-50 px-3 py-2 text-sm font-semibold text-green-700 shadow-sm ring-1 ring-inset ring-green-200 hover:bg-green-100">
                      Discharge Home
                    </button>
                  </div>
                )}

                {activeTab === 'History' && (
                  <div className="shrink-0 w-full sm:w-auto text-right">
                    <span className={`inline-flex items-center rounded-md px-2 py-1 text-sm font-medium ring-1 ring-inset ${
                      triage.status === 'Admitted'  ? 'bg-purple-50 text-purple-700 ring-purple-600/20' :
                      triage.status === 'Discharged' ? 'bg-green-50 text-green-700 ring-green-600/20' :
                      triage.status === 'Deceased'   ? 'bg-gray-200 text-gray-800 ring-gray-500/20' :
                                                       'bg-gray-50 text-gray-600 ring-gray-500/10'
                    }`}>
                      Outcome: {triage.status}
                    </span>
                    <p className="text-xs text-gray-500 mt-2">
                      {triage.dischargedTime ? `Closed: ${new Date(triage.dischargedTime).toLocaleString()}` : '—'}
                    </p>
                  </div>
                )}
              </div>
            </div>
          ))
        )}
      </div>

      {/* Triage Modal — turns red + pulses a "TRAUMA CODE" chip when in unidentified mode. */}
      {triageModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="fixed inset-0 bg-gray-900/70 backdrop-blur-[1px]" onClick={() => !isSubmitting && setTriageModalOpen(false)} />
          <div className={`relative bg-white rounded-2xl shadow-2xl w-full max-w-2xl p-6 flex flex-col max-h-[90vh] ring-2 transition-colors ${
            isTraumaMode ? 'ring-red-500' : 'ring-gray-200'
          }`}>
            {/* Top accent strip that mirrors the selected triage level. */}
            <div className={`absolute top-0 left-0 right-0 h-1.5 rounded-t-2xl ${triageColors[formData.triageLevel]?.split(' ')[0] ?? 'bg-red-500'}`} />

            <div className="flex justify-between items-center mb-4 shrink-0 mt-1">
              <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                <Siren className={isTraumaMode ? 'text-red-600 animate-pulse' : 'text-red-600'} />
                New ER Arrival &amp; Triage
                {isTraumaMode && (
                  <span className="ml-1 inline-flex items-center gap-1 rounded-md bg-red-600 px-2 py-0.5 text-[10px] font-black uppercase tracking-widest text-white animate-pulse">
                    <span className="h-1.5 w-1.5 rounded-full bg-white" /> Trauma Code
                  </span>
                )}
              </h2>
              <button
                onClick={() => !isSubmitting && setTriageModalOpen(false)}
                disabled={isSubmitting}
                className="text-gray-500 hover:text-gray-700 disabled:opacity-40"
                aria-label="Close"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {staffList.length === 0 && (
              <div className="mb-3 flex items-start gap-2 rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-900 ring-1 ring-amber-200">
                <AlertTriangle className="h-4 w-4 mt-0.5 shrink-0 text-amber-600" />
                <span>No attending staff are configured yet. The system will auto-assign the first available operator on save.</span>
              </div>
            )}

            <div className="overflow-y-auto flex-1 pr-2">
              <form id="triageForm" onSubmit={handleTriageSubmit} className="space-y-6">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Attending Staff / Nurse</label>
                    <select
                      required={staffList.length > 0}
                      value={formData.staffId}
                      onChange={e => setFormData({ ...formData, staffId: parseInt(e.target.value) })}
                      disabled={staffList.length === 0}
                      className="block w-full rounded-md border-0 py-1.5 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 focus:ring-2 focus:ring-red-600 sm:text-sm sm:leading-6 disabled:bg-gray-50 disabled:text-gray-400"
                    >
                      {staffList.length === 0
                        ? <option value={0}>— no operators available —</option>
                        : staffList.map((s: Staff) => <option key={s.id} value={s.id}>{s.name} ({s.role})</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-bold text-red-700 mb-1">Triage Level</label>
                    <select
                      required
                      value={formData.triageLevel}
                      onChange={e => setFormData({ ...formData, triageLevel: e.target.value })}
                      className="block w-full rounded-md border-0 py-1.5 text-gray-900 shadow-sm ring-1 ring-inset ring-red-300 focus:ring-2 focus:ring-red-600 sm:text-sm sm:leading-6 font-bold bg-red-50"
                    >
                      <option value="Resuscitation">Level 1: Resuscitation (Immediate)</option>
                      <option value="Emergent">Level 2: Emergent (15 mins)</option>
                      <option value="Urgent">Level 3: Urgent (30–60 mins)</option>
                      <option value="Less Urgent">Level 4: Less Urgent (1–2 hours)</option>
                      <option value="Non-Urgent">Level 5: Non-Urgent (2–24 hours)</option>
                    </select>
                  </div>
                </div>

                <div className="border-t border-gray-100 pt-4">
                  <div className="flex gap-4 mb-4">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input type="radio" name="patientType" checked={formData.patientType === 'registered'} onChange={() => setFormData({ ...formData, patientType: 'registered' })} className="text-red-600 focus:ring-red-600" />
                      <span className="text-sm font-medium">Registered Patient</span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input type="radio" name="patientType" checked={formData.patientType === 'unidentified'} onChange={() => setFormData({ ...formData, patientType: 'unidentified' })} className="text-red-600 focus:ring-red-600" />
                      <span className="text-sm font-medium">Unidentified / Trauma Code</span>
                    </label>
                  </div>

                  {formData.patientType === 'registered' ? (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Select Patient</label>
                      <select
                        value={formData.patientId}
                        onChange={e => setFormData({ ...formData, patientId: parseInt(e.target.value) })}
                        className="block w-full rounded-md border-0 py-1.5 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 focus:ring-2 focus:ring-red-600 sm:text-sm sm:leading-6"
                      >
                        {patients.length === 0
                          ? <option value={0}>— no patients registered —</option>
                          : patients.map((p: Patient) => <option key={p.id} value={p.id}>{p.firstName} {p.lastName} (DOB: {new Date(p.dob).toLocaleDateString()})</option>)}
                      </select>
                    </div>
                  ) : (
                    <div className={`rounded-lg p-3 ring-1 transition-colors ${isTraumaMode ? 'bg-red-50 ring-red-200' : 'bg-gray-50 ring-gray-200'}`}>
                      <label className="block text-sm font-semibold text-red-800 mb-1">Trauma Alias</label>
                      <p className="text-[11px] text-red-700/80 mb-2">Use the format the bay will actually call out — e.g. &ldquo;John Doe – Bay 3&rdquo; or &ldquo;MVA-01&rdquo;.</p>
                      <input
                        required
                        autoFocus
                        type="text"
                        value={formData.unidentifiedName}
                        onChange={e => setFormData({ ...formData, unidentifiedName: e.target.value })}
                        maxLength={240}
                        placeholder="John Doe – Bay 3"
                        className="block w-full rounded-md border-0 py-1.5 text-gray-900 shadow-sm ring-1 ring-inset ring-red-300 focus:ring-2 focus:ring-red-600 sm:text-sm sm:leading-6 font-medium"
                      />
                      <div className="mt-2 flex items-center gap-2 text-[11px]">
                        <span className="text-red-700/80">Board label preview:</span>
                        <span className={`inline-flex items-center gap-1 rounded px-2 py-0.5 font-mono text-[11px] font-bold ${aliasPreview ? 'bg-white text-red-800 ring-1 ring-red-300' : 'bg-red-100/60 text-red-500 italic'}`}>
                          <span className="h-1.5 w-1.5 rounded-full bg-red-500 animate-pulse" />
                          {aliasPreview ? `UNIDENTIFIED / ${aliasPreview}` : '— waiting for alias —'}
                        </span>
                      </div>
                    </div>
                  )}
                </div>

                <div className="border-t border-gray-100 pt-4 space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Chief Complaint</label>
                    <textarea
                      required
                      rows={2}
                      value={formData.chiefComplaint}
                      onChange={e => setFormData({ ...formData, chiefComplaint: e.target.value })}
                      className="block w-full rounded-md border-0 py-1.5 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 focus:ring-2 focus:ring-red-600 sm:text-sm sm:leading-6"
                      placeholder="Main reason for ER visit…"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Mechanism of Injury (Optional)</label>
                    <input
                      type="text"
                      value={formData.mechanismOfInjury}
                      onChange={e => setFormData({ ...formData, mechanismOfInjury: e.target.value })}
                      className="block w-full rounded-md border-0 py-1.5 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 focus:ring-2 focus:ring-red-600 sm:text-sm sm:leading-6"
                      placeholder="e.g. MVA, fall from height, penetrating trauma…"
                    />
                  </div>
                </div>

                <div className="border-t border-gray-100 pt-4">
                  <p className="block text-sm font-medium text-gray-900 mb-3 flex items-center"><AlertOctagon className="w-4 h-4 mr-2 text-red-600"/> Automated STAT Orders</p>
                  <div className="bg-red-50 p-4 rounded-lg border border-red-100 space-y-3">
                    <label className="flex items-center gap-3 cursor-pointer">
                      <input type="checkbox" checked={formData.orderStatLabs} onChange={e => setFormData({ ...formData, orderStatLabs: e.target.checked })} className="h-4 w-4 rounded border-gray-300 text-red-600 focus:ring-red-600" />
                      <span className="text-sm font-medium text-red-900">Order STAT ER Labs (CMP, CBC, Cardiac Biomarkers)</span>
                    </label>
                    <label className="flex items-center gap-3 cursor-pointer">
                      <input type="checkbox" checked={formData.orderStatImaging} onChange={e => setFormData({ ...formData, orderStatImaging: e.target.checked })} className="h-4 w-4 rounded border-gray-300 text-red-600 focus:ring-red-600" />
                      <span className="text-sm font-medium text-red-900">Order STAT Portable Chest X-Ray</span>
                    </label>
                  </div>
                </div>
              </form>
            </div>

            <div className="mt-6 flex justify-end gap-3 pt-4 border-t border-gray-100 shrink-0">
              <button
                type="button"
                onClick={() => !isSubmitting && setTriageModalOpen(false)}
                disabled={isSubmitting}
                className="px-4 py-2 text-sm text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-40"
              >
                Cancel
              </button>
              <button
                form="triageForm"
                type="submit"
                disabled={isSubmitting}
                className="px-6 py-2 text-sm font-bold text-white bg-red-600 rounded-md hover:bg-red-500 disabled:opacity-70 flex items-center gap-2 shadow-sm"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Registering trauma record…
                  </>
                ) : (
                  <>
                    <UserPlus className="h-4 w-4" />
                    Register to Trauma Board
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
