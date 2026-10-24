import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import { eq } from 'drizzle-orm';
import { ArrowLeft, ClipboardPlus } from 'lucide-react';
import { db } from '@/db';
import { systemSettings } from '@/db/schema';
import { currentUser } from '@/lib/auth';
import { WORKFLOW_DEFINITIONS_KEY, parseWorkflowRecords, parseWorkflows, workflowRecordsKey, type AdminWorkflow, type WorkflowRecord } from '@/lib/workflow-studio';
import WorkflowEntryClient from './WorkflowEntryClient';

export const dynamic = 'force-dynamic';

export default async function WorkflowPage({ params }: { params: Promise<{ id: string }> }) {
  const actor = await currentUser();
  if (!actor || actor.role !== 'super_admin') redirect('/unauthorized');
  const { id } = await params;
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(id)) notFound();
  const [definition, recordSetting] = await Promise.all([
    db.query.systemSettings.findFirst({ where: eq(systemSettings.settingKey, WORKFLOW_DEFINITIONS_KEY) }),
    db.query.systemSettings.findFirst({ where: eq(systemSettings.settingKey, workflowRecordsKey(id)) }),
  ]);
  let workflows: AdminWorkflow[] = [];
  let records: WorkflowRecord[] = [];
  try { workflows = parseWorkflows(definition?.settingValue ? JSON.parse(definition.settingValue) : []); } catch { workflows = []; }
  try { records = parseWorkflowRecords(recordSetting?.settingValue ? JSON.parse(recordSetting.settingValue) : []); } catch { records = []; }
  const workflow = workflows.find((item) => item.id === id);
  if (!workflow) notFound();
  return <div className="mx-auto max-w-5xl space-y-6">
    <Link href="/workflow-studio" className="inline-flex items-center gap-2 text-sm font-medium text-slate-600 hover:text-teal-800"><ArrowLeft size={16} /> Workflow Studio</Link>
    <header className="rounded-2xl bg-gradient-to-r from-slate-950 via-slate-900 to-indigo-900 p-7 text-white shadow-lg"><div className="flex items-center gap-3"><span className="rounded-xl bg-white/10 p-3"><ClipboardPlus size={22} /></span><div><p className="text-sm font-semibold uppercase tracking-[.18em] text-indigo-200">Super admin workflow</p><h1 className="mt-1 text-2xl font-bold">{workflow.name}</h1></div></div>{workflow.description && <p className="mt-4 max-w-2xl text-sm leading-6 text-slate-200">{workflow.description}</p>}</header>
    <WorkflowEntryClient workflow={workflow} initialRecords={records} />
  </div>;
}
