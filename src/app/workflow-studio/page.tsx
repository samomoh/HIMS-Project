import { redirect } from 'next/navigation';
import { eq } from 'drizzle-orm';
import { db } from '@/db';
import { systemSettings } from '@/db/schema';
import { currentUser } from '@/lib/auth';
import { WORKFLOW_DEFINITIONS_KEY, parseWorkflows, type AdminWorkflow } from '@/lib/workflow-studio';
import WorkflowStudioClient from './WorkflowStudioClient';

export const dynamic = 'force-dynamic';

export default async function WorkflowStudioPage() {
  const actor = await currentUser();
  if (!actor || actor.role !== 'super_admin') redirect('/unauthorized');
  const setting = await db.query.systemSettings.findFirst({ where: eq(systemSettings.settingKey, WORKFLOW_DEFINITIONS_KEY) });
  let workflows: AdminWorkflow[] = [];
  try { workflows = parseWorkflows(setting?.settingValue ? JSON.parse(setting.settingValue) : []); } catch { workflows = []; }
  return <WorkflowStudioClient initialWorkflows={workflows} />;
}
