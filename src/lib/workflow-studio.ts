export const WORKFLOW_DEFINITIONS_KEY = 'ADMIN_WORKFLOW_DEFINITIONS';
export const workflowRecordsKey = (id: string) => `ADMIN_WORKFLOW_RECORDS_${id}`;

export const WORKFLOW_FIELD_TYPES = ['text', 'textarea', 'number', 'date', 'select', 'checkbox'] as const;
export type WorkflowFieldType = (typeof WORKFLOW_FIELD_TYPES)[number];
export type WorkflowField = { id: string; label: string; type: WorkflowFieldType; required: boolean; options: string[] };
export type AdminWorkflow = { id: string; name: string; description: string; fields: WorkflowField[]; createdAt: string; updatedAt: string };
export type WorkflowRecord = { id: string; submittedAt: string; submittedBy: string; values: Record<string, string | boolean> };
const isId = (value: string) => /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);

export function parseWorkflows(value: unknown): AdminWorkflow[] {
  if (!Array.isArray(value)) return [];
  return value.flatMap((item): AdminWorkflow[] => {
    if (!item || typeof item !== 'object') return [];
    const candidate = item as Partial<AdminWorkflow>;
    if (typeof candidate.id !== 'string' || !isId(candidate.id) || typeof candidate.name !== 'string' || !candidate.name.trim() || !Array.isArray(candidate.fields)) return [];
    const fields = candidate.fields.flatMap((raw): WorkflowField[] => {
      if (!raw || typeof raw !== 'object') return [];
      const field = raw as Partial<WorkflowField>;
      if (typeof field.id !== 'string' || !isId(field.id) || typeof field.label !== 'string' || !field.label.trim() || !WORKFLOW_FIELD_TYPES.includes(field.type as WorkflowFieldType)) return [];
      const options = Array.isArray(field.options) ? field.options.filter((option): option is string => typeof option === 'string').slice(0, 30) : [];
      return [{ id: field.id, label: field.label.trim(), type: field.type as WorkflowFieldType, required: field.required === true, options }];
    }).slice(0, 20);
    if (!fields.length) return [];
    return [{ id: candidate.id, name: candidate.name.trim().slice(0, 80), description: typeof candidate.description === 'string' ? candidate.description.slice(0, 500) : '', fields,
      createdAt: typeof candidate.createdAt === 'string' ? candidate.createdAt : '', updatedAt: typeof candidate.updatedAt === 'string' ? candidate.updatedAt : '' }];
  }).slice(0, 30);
}

export function parseWorkflowRecords(value: unknown): WorkflowRecord[] {
  if (!Array.isArray(value)) return [];
  return value.flatMap((item): WorkflowRecord[] => {
    if (!item || typeof item !== 'object') return [];
    const record = item as Partial<WorkflowRecord>;
    if (typeof record.id !== 'string' || typeof record.submittedAt !== 'string' || typeof record.submittedBy !== 'string' || !record.values || typeof record.values !== 'object' || Array.isArray(record.values)) return [];
    return [{ id: record.id, submittedAt: record.submittedAt, submittedBy: record.submittedBy, values: record.values as Record<string, string | boolean> }];
  }).slice(0, 250);
}
