import { NextResponse } from 'next/server';
import { db } from '@/db';
import { patients } from '@/db/schema';
import { logAuditTrail } from '@/lib/audit';
import { requireUser } from '@/lib/auth';
import { parsePatientInput, type PatientInput } from '@/lib/patient-input';
import { readJsonBody, RequestBodyError } from '@/lib/request-json';

// Never evaluated at build time — DB access happens strictly per-request.
export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  try {
    const actor = await requireUser(['super_admin', 'admin', 'receptionist', 'medical_records']);
    const payload: unknown = await readJsonBody(request);
    if (!payload || typeof payload !== 'object' || !Array.isArray((payload as { patients?: unknown }).patients)) {
      return NextResponse.json({ error: 'Invalid payload' }, { status: 400 });
    }
    const patientList = (payload as { patients: unknown[] }).patients;
    if (patientList.length === 0 || patientList.length > 100) return NextResponse.json({ error: 'Import between 1 and 100 patients per request.' }, { status: 400 });
    const validPatients = patientList.map(parsePatientInput);
    if (validPatients.some((patient) => !patient)) return NextResponse.json({ error: 'One or more patient records are invalid.' }, { status: 400 });
    const patientsToInsert = validPatients.filter((patient): patient is PatientInput => patient !== null);

    await db.transaction(async (tx) => tx.insert(patients).values(patientsToInsert));
    await logAuditTrail(actor.id, 'Batch Import Patients', 'Patients', `Imported ${patientsToInsert.length} patient records`);

    return NextResponse.json({ success: true, count: patientsToInsert.length });
  } catch (error) {
    if (error instanceof RequestBodyError) return NextResponse.json({ error: error.message }, { status: error.status });
    console.error('Error batch inserting patients:', error);
    return NextResponse.json({ error: 'Failed to batch insert patients' }, { status: 500 });
  }
}
