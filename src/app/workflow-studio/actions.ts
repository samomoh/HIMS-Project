'use server';

import { eq } from 'drizzle-orm';
import { revalidatePath } from 'next/cache';
import { randomUUID } from 'node:crypto';
import { db } from '@/db';
import { systemSettings } from '@/db/schema';
import { logAuditTrail } from '@/lib/audit';
import { requireUser } from '@/lib/auth';
import { WORKFLOW_DEFINITIONS_KEY, WORKFLOW_FIELD_TYPES, parseWorkflowRecords, parseWorkflows, workflowRecordsKey, type AdminWorkflow, type WorkflowField, type WorkflowRecord } from '@/lib/workflow-studio';
const isId = (value: string) => /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);

async function getWorkflows() {
  const row = await db.query.systemSettings.findFirst({ where: eq(systemSettings.settingKey, WORKFLOW_DEFINITIONS_KEY) });
  try { return parseWorkflows(row?.settingValue ? JSON.parse(row.settingValue) : []); } catch { return []; }
}

async function saveSetting(key: string, value: unknown, description: string) {
  await db.insert(systemSettings).values({ settingKey: key, settingValue: JSON.stringify(value), description })
    .onConflictDoUpdate({ target: systemSettings.settingKey, set: { settingValue: JSON.stringify(value), description, updatedAt: new Date() } });
}

export async function saveWorkflowAction(input: unknown): Promise<{ id: string }> {
  const actor = await requireUser(['super_admin']);
  if (!input || typeof input !== 'object') throw new Error('Workflow details are invalid.');
  const data = input as Record<string, unknown>;
  const name = typeof data.name === 'string' ? data.name.trim() : '';
  const description = typeof data.description === 'string' ? data.description.trim() : '';
  if (!name || name.length > 80 || description.length > 500) throw new Error('Enter a workflow name and a description of up to 500 characters.');
  if (!Array.isArray(data.fields) || data.fields.length < 1 || data.fields.length > 20) throw new Error('A workflow needs between 1 and 20 fields.');
  const fields: WorkflowField[] = data.fields.map((raw) => {
    if (!raw || typeof raw !== 'object') throw new Error('A workflow field is invalid.');
    const field = raw as Record<string, unknown>;
    const label = typeof field.label === 'string' ? field.label.trim() : '';
    const type = field.type;
    if (!label || label.length > 80 || !WORKFLOW_FIELD_TYPES.includes(type as WorkflowField['type'])) throw new Error('Each field needs a label and a valid field type.');
    const options = type === 'select' && Array.isArray(field.options) ? field.options.map((option) => typeof option === 'string' ? option.trim() : '').filter(Boolean) : [];
    if (type === 'select' && (!options.length || options.length > 30 || options.some((option) => option.length > 80))) throw new Error(`Add 1 to 30 valid options for “${label}”.`);
    return { id: typeof field.id === 'string' && isId(field.id) ? field.id : randomUUID(), label, type: type as WorkflowField['type'], required: field.required === true, options: [...new Set(options)] };
  });
  if (new Set(fields.map((field) => field.id)).size !== fields.length) throw new Error('Workflow field identifiers must be unique.');
  const existing = await getWorkflows();
  const id = typeof data.id === 'string' && isId(data.id) && existing.some((workflow) => workflow.id === data.id) ? data.id : randomUUID();
  const now = new Date().toISOString();
  const prior = existing.find((workflow) => workflow.id === id);
  const workflow: AdminWorkflow = { id, name, description, fields, createdAt: prior?.createdAt || now, updatedAt: now };
  const workflows = prior ? existing.map((item) => item.id === id ? workflow : item) : [...existing, workflow];
  if (workflows.length > 30) throw new Error('The workflow limit of 30 has been reached.');
  await saveSetting(WORKFLOW_DEFINITIONS_KEY, workflows, 'Super admin configured workflows');
  await logAuditTrail(actor.id, prior ? 'Updated Workflow' : 'Created Workflow', 'Workflow Studio', `${name} (${id})`);
  revalidatePath('/', 'layout'); revalidatePath('/workflow-studio'); revalidatePath(`/workflows/${id}`);
  return { id };
}

export async function deleteWorkflowAction(id: string) {
  const actor = await requireUser(['super_admin']);
  if (!isId(id)) throw new Error('Workflow not found.');
  const existing = await getWorkflows();
  const workflow = existing.find((item) => item.id === id);
  if (!workflow) throw new Error('Workflow not found.');
  await db.delete(systemSettings).where(eq(systemSettings.settingKey, workflowRecordsKey(id)));
  await saveSetting(WORKFLOW_DEFINITIONS_KEY, existing.filter((item) => item.id !== id), 'Super admin configured workflows');
  await logAuditTrail(actor.id, 'Deleted Workflow', 'Workflow Studio', `${workflow.name} (${id}) and its captured entries.`);
  revalidatePath('/', 'layout'); revalidatePath('/workflow-studio'); revalidatePath(`/workflows/${id}`);
  return { success: true };
}

export async function submitWorkflowRecordAction(id: string, input: unknown) {
  const actor = await requireUser(['super_admin']);
  if (!isId(id) || !input || typeof input !== 'object' || Array.isArray(input)) throw new Error('Entry details are invalid.');
  const workflow = (await getWorkflows()).find((item) => item.id === id);
  if (!workflow) throw new Error('Workflow not found.');
  const submitted = input as Record<string, unknown>;
  const values: Record<string, string | boolean> = {};
  for (const field of workflow.fields) {
    const raw = submitted[field.id];
    if (field.type === 'checkbox') {
      values[field.id] = raw === true || raw === 'true';
      if (field.required && values[field.id] !== true) throw new Error(`${field.label} must be checked.`);
      continue;
    }
    const value = typeof raw === 'string' ? raw.trim() : '';
    if (field.required && !value) throw new Error(`${field.label} is required.`);
    if (value.length > 2000) throw new Error(`${field.label} is too long.`);
    if (field.type === 'number' && value && !Number.isFinite(Number(value))) throw new Error(`${field.label} must be a number.`);
    if (field.type === 'date' && value && !/^\d{4}-\d{2}-\d{2}$/.test(value)) throw new Error(`${field.label} must be a valid date.`);
    if (field.type === 'select' && value && !field.options.includes(value)) throw new Error(`Choose a valid option for ${field.label}.`);
    values[field.id] = value;
  }
  const key = workflowRecordsKey(id);
  const row = await db.query.systemSettings.findFirst({ where: eq(systemSettings.settingKey, key) });
  let records: WorkflowRecord[] = [];
  try { records = parseWorkflowRecords(row?.settingValue ? JSON.parse(row.settingValue) : []); } catch { records = []; }
  if (records.length >= 250) throw new Error('This workflow has reached its 250-entry limit. Export or archive entries before continuing.');
  const record: WorkflowRecord = { id: randomUUID(), submittedAt: new Date().toISOString(), submittedBy: actor.name, values };
  await saveSetting(key, [record, ...records], `Entries for workflow ${workflow.name}`);
  await logAuditTrail(actor.id, 'Submitted Workflow Entry', 'Workflow Studio', `${workflow.name} (${id})`);
  revalidatePath(`/workflows/${id}`);
  return { success: true };
}
