'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { FilePlus2, Pencil, Plus, Trash2, Workflow } from 'lucide-react';
import { WORKFLOW_FIELD_TYPES, type AdminWorkflow, type WorkflowField, type WorkflowFieldType } from '@/lib/workflow-studio';
import { deleteWorkflowAction, saveWorkflowAction } from './actions';

const fieldLabels: Record<WorkflowFieldType, string> = { text: 'Short text', textarea: 'Long text', number: 'Number', date: 'Date', select: 'Dropdown list', checkbox: 'Checkbox' };
const newField = (): WorkflowField => ({ id: crypto.randomUUID(), label: '', type: 'text', required: false, options: [] });

export default function WorkflowStudioClient({ initialWorkflows }: { initialWorkflows: AdminWorkflow[] }) {
  const router = useRouter();
  const [workflows, setWorkflows] = useState(initialWorkflows);
  const [editing, setEditing] = useState<AdminWorkflow | null>(null);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [fields, setFields] = useState<WorkflowField[]>([]);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');

  const startNew = () => { setEditing(null); setName(''); setDescription(''); setFields([newField()]); setMessage(''); };
  const startEdit = (workflow: AdminWorkflow) => { setEditing(workflow); setName(workflow.name); setDescription(workflow.description); setFields(workflow.fields.map((field) => ({ ...field, options: [...field.options] }))); setMessage(''); };
  const updateField = (id: string, patch: Partial<WorkflowField>) => setFields((current) => current.map((field) => field.id === id ? { ...field, ...patch } : field));
  const save = async (event: React.FormEvent) => {
    event.preventDefault(); setBusy(true); setMessage('');
    try {
      const result = await saveWorkflowAction({ id: editing?.id, name, description, fields });
      setMessage('Workflow published.'); setEditing(null); setFields([]); setName(''); setDescription('');
      setWorkflows((current) => {
        const saved: AdminWorkflow = { id: result.id, name: name.trim(), description: description.trim(), fields, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() };
        return current.some((item) => item.id === result.id) ? current.map((item) => item.id === result.id ? { ...item, ...saved } : item) : [...current, saved];
      });
      router.refresh();
    } catch (error) { setMessage(error instanceof Error ? error.message : 'Could not save this workflow.'); }
    finally { setBusy(false); }
  };
  const remove = async (workflow: AdminWorkflow) => {
    if (!window.confirm(`Delete “${workflow.name}” and all of its captured entries? This cannot be undone.`)) return;
    setBusy(true); setMessage('');
    try { await deleteWorkflowAction(workflow.id); setWorkflows((current) => current.filter((item) => item.id !== workflow.id)); if (editing?.id === workflow.id) startNew(); setMessage('Workflow and its entries were deleted.'); router.refresh(); }
    catch (error) { setMessage(error instanceof Error ? error.message : 'Could not delete this workflow.'); }
    finally { setBusy(false); }
  };

  return <div className="mx-auto max-w-6xl space-y-6">
    <header className="rounded-2xl bg-gradient-to-r from-slate-950 via-indigo-950 to-teal-900 p-7 text-white shadow-lg"><div className="flex items-center gap-3"><span className="rounded-xl bg-white/10 p-3"><Workflow size={22} /></span><div><p className="text-sm font-semibold uppercase tracking-[.18em] text-teal-200">Super admin tools</p><h1 className="mt-1 text-2xl font-bold">Workflow Studio</h1></div></div><p className="mt-4 max-w-3xl text-sm leading-6 text-slate-200">Build internal data capture screens with no code changes. Add fields, publish a screen, and collect and review entries. These workflows are visible to super admins only.</p></header>
    <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(360px,1.1fr)]">
      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6"><div className="mb-5 flex items-start justify-between gap-3"><div><h2 className="text-lg font-semibold text-slate-900">Your workflows</h2><p className="mt-1 text-sm text-slate-500">{workflows.length} of 30 configured</p></div><button disabled={busy || workflows.length >= 30} onClick={startNew} className="inline-flex items-center gap-2 rounded-lg bg-teal-700 px-3 py-2 text-sm font-semibold text-white hover:bg-teal-800 disabled:opacity-50"><Plus size={16} /> New workflow</button></div>
        <div className="space-y-3">{workflows.length === 0 && <div className="rounded-xl border border-dashed border-slate-300 p-7 text-center"><FilePlus2 className="mx-auto text-teal-700" /><p className="mt-3 text-sm font-medium text-slate-700">No workflows yet</p><p className="mt-1 text-sm text-slate-500">Create your first configurable screen.</p></div>}{workflows.map((workflow) => <article key={workflow.id} className="rounded-xl border border-slate-200 p-4"><div className="flex items-start justify-between gap-3"><div className="min-w-0"><h3 className="font-semibold text-slate-900">{workflow.name}</h3><p className="mt-1 line-clamp-2 text-sm text-slate-500">{workflow.description || 'No description'}</p><p className="mt-2 text-xs text-slate-500">{workflow.fields.length} fields</p></div><div className="flex shrink-0 items-center gap-1"><button aria-label={`Edit ${workflow.name}`} onClick={() => startEdit(workflow)} className="rounded-lg p-2 text-slate-500 hover:bg-slate-100 hover:text-indigo-700"><Pencil size={16} /></button><button aria-label={`Delete ${workflow.name}`} disabled={busy} onClick={() => remove(workflow)} className="rounded-lg p-2 text-slate-500 hover:bg-rose-50 hover:text-rose-700 disabled:opacity-50"><Trash2 size={16} /></button></div></div><Link href={`/workflows/${workflow.id}`} className="mt-3 inline-flex text-sm font-semibold text-teal-800 hover:text-teal-950">Open screen and entries →</Link></article>)}</div>
      </section>
      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6"><div className="mb-5"><h2 className="text-lg font-semibold text-slate-900">{editing ? 'Edit workflow' : 'Build a screen'}</h2><p className="mt-1 text-sm text-slate-500">Set up the screen and the information it collects.</p></div>
        <form onSubmit={save} className="space-y-4"><label className="block text-sm font-medium text-slate-700">Workflow name<input required maxLength={80} value={name} onChange={(event) => setName(event.target.value)} placeholder="e.g. Equipment handover" className="mt-1.5 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-teal-500 focus:ring-2 focus:ring-teal-100" /></label><label className="block text-sm font-medium text-slate-700">Description<textarea maxLength={500} rows={2} value={description} onChange={(event) => setDescription(event.target.value)} placeholder="What is this workflow used for?" className="mt-1.5 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-teal-500 focus:ring-2 focus:ring-teal-100" /></label>
          <div className="flex items-center justify-between gap-3"><div><h3 className="text-sm font-semibold text-slate-800">Form fields</h3><p className="text-xs text-slate-500">1 to 20 fields · up to 30 dropdown choices</p></div><button type="button" disabled={fields.length >= 20} onClick={() => setFields((current) => [...current, newField()])} className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50"><Plus size={15} /> Add field</button></div>
          <div className="space-y-3">{fields.map((field, index) => <div key={field.id} className="rounded-xl border border-slate-200 bg-slate-50 p-3"><div className="grid gap-3 sm:grid-cols-[1fr_150px_auto]"><label className="text-xs font-semibold text-slate-600">Field {index + 1}<input required maxLength={80} value={field.label} onChange={(event) => updateField(field.id, { label: event.target.value })} placeholder="Field label" className="mt-1 block w-full rounded-md border border-slate-300 bg-white px-2.5 py-2 text-sm font-normal text-slate-800" /></label><label className="text-xs font-semibold text-slate-600">Type<select value={field.type} onChange={(event) => updateField(field.id, { type: event.target.value as WorkflowFieldType, options: event.target.value === 'select' && field.options.length === 0 ? ['Option 1'] : field.options })} className="mt-1 block w-full rounded-md border border-slate-300 bg-white px-2.5 py-2 text-sm font-normal text-slate-800">{WORKFLOW_FIELD_TYPES.map((type) => <option key={type} value={type}>{fieldLabels[type]}</option>)}</select></label><button type="button" disabled={fields.length <= 1} aria-label={`Remove field ${index + 1}`} onClick={() => setFields((current) => current.filter((entry) => entry.id !== field.id))} className="self-end rounded-md p-2 text-slate-500 hover:bg-rose-50 hover:text-rose-700 disabled:opacity-30"><Trash2 size={16} /></button></div>{field.type === 'select' && <label className="mt-3 block text-xs font-semibold text-slate-600">Dropdown options, one per line<textarea required rows={3} value={field.options.join('\n')} onChange={(event) => updateField(field.id, { options: event.target.value.split('\n').slice(0, 30) })} className="mt-1 block w-full rounded-md border border-slate-300 bg-white px-2.5 py-2 text-sm font-normal text-slate-800" /></label>}<label className="mt-3 inline-flex items-center gap-2 text-sm text-slate-600"><input type="checkbox" checked={field.required} onChange={(event) => updateField(field.id, { required: event.target.checked })} className="rounded border-slate-300 text-teal-600 focus:ring-teal-500" />Required field</label></div>)}</div>
          <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 pt-4"><p role="status" className="text-sm text-slate-600">{message}</p><button disabled={busy || fields.length === 0} className="rounded-lg bg-indigo-700 px-4 py-2.5 text-sm font-semibold text-white hover:bg-indigo-800 disabled:opacity-50">{busy ? 'Saving…' : editing ? 'Save changes' : 'Publish workflow'}</button></div>
        </form>
      </section>
    </div>
  </div>;
}
