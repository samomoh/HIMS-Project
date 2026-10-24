'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { ClipboardList, Send } from 'lucide-react';
import { submitWorkflowRecordAction } from '@/app/workflow-studio/actions';
import type { AdminWorkflow, WorkflowRecord } from '@/lib/workflow-studio';

export default function WorkflowEntryClient({ workflow, initialRecords }: { workflow: AdminWorkflow; initialRecords: WorkflowRecord[] }) {
  const router = useRouter();
  const [values, setValues] = useState<Record<string, string | boolean>>({});
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);
  const submit = async (event: React.FormEvent) => {
    event.preventDefault(); setBusy(true); setMessage('');
    try { await submitWorkflowRecordAction(workflow.id, values); setValues({}); setMessage('Entry submitted.'); router.refresh(); }
    catch (error) { setMessage(error instanceof Error ? error.message : 'Could not submit this entry.'); }
    finally { setBusy(false); }
  };
  const display = (value: string | boolean | undefined) => value === true ? 'Yes' : value === false ? 'No' : value || '—';
  return <div className="grid gap-6 lg:grid-cols-[minmax(320px,.8fr)_minmax(0,1.2fr)]">
    <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6"><div className="mb-5 flex items-center gap-2"><ClipboardList className="text-indigo-700" size={19} /><h2 className="text-lg font-semibold text-slate-900">New entry</h2></div><form onSubmit={submit} className="space-y-4">{workflow.fields.map((field) => <label key={field.id} className="block text-sm font-medium text-slate-700">{field.label}{field.required && <span className="ml-1 text-rose-600">*</span>}{field.type === 'textarea' ? <textarea required={field.required} maxLength={2000} value={String(values[field.id] ?? '')} onChange={(event) => setValues((current) => ({ ...current, [field.id]: event.target.value }))} rows={3} className="mt-1.5 block w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100" /> : field.type === 'select' ? <select required={field.required} value={String(values[field.id] ?? '')} onChange={(event) => setValues((current) => ({ ...current, [field.id]: event.target.value }))} className="mt-1.5 block w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm"><option value="">Select…</option>{field.options.map((option) => <option key={option}>{option}</option>)}</select> : field.type === 'checkbox' ? <span className="mt-2 flex items-center gap-2"><input type="checkbox" checked={values[field.id] === true} onChange={(event) => setValues((current) => ({ ...current, [field.id]: event.target.checked }))} className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500" /><span className="text-sm font-normal text-slate-600">Yes</span></span> : <input required={field.required} type={field.type} maxLength={field.type === 'text' ? 500 : undefined} value={String(values[field.id] ?? '')} onChange={(event) => setValues((current) => ({ ...current, [field.id]: event.target.value }))} className="mt-1.5 block w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100" />}</label>)}<div className="flex items-center justify-between gap-3"><p role="status" className="text-sm text-slate-600">{message}</p><button disabled={busy} className="inline-flex shrink-0 items-center gap-2 rounded-lg bg-indigo-700 px-4 py-2.5 text-sm font-semibold text-white hover:bg-indigo-800 disabled:opacity-60"><Send size={15} />{busy ? 'Submitting…' : 'Submit entry'}</button></div></form></section>
    <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6"><div className="mb-5 flex items-start justify-between gap-3"><div><h2 className="text-lg font-semibold text-slate-900">Recent entries</h2><p className="mt-1 text-sm text-slate-500">{initialRecords.length} captured · newest first</p></div></div>{initialRecords.length === 0 ? <div className="rounded-xl border border-dashed border-slate-300 p-8 text-center text-sm text-slate-500">Submitted entries will appear here.</div> : <div className="space-y-3">{initialRecords.map((record) => <article key={record.id} className="rounded-xl border border-slate-200 p-4"><div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 pb-2"><time className="text-xs font-medium text-slate-600">{new Date(record.submittedAt).toLocaleString()}</time><span className="text-xs text-slate-500">Submitted by {record.submittedBy}</span></div><dl className="mt-3 grid gap-x-4 gap-y-2 sm:grid-cols-2">{workflow.fields.map((field) => <div key={field.id} className="min-w-0"><dt className="text-xs font-medium text-slate-500">{field.label}</dt><dd className="break-words text-sm text-slate-800">{display(record.values[field.id])}</dd></div>)}</dl></article>)}</div>}</section>
  </div>;
}
