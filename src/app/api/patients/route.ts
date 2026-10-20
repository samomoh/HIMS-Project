import { NextResponse } from 'next/server';
import { db } from '@/db';
import { patients } from '@/db/schema';
import { logAuditTrail } from '@/lib/audit';
import { requireUser } from '@/lib/auth';
import { parsePatientInput } from '@/lib/patient-input';
import { readJsonBody, RequestBodyError } from '@/lib/request-json';

// Never evaluated at build time — DB access happens strictly per-request.
export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  try {
    const actor = await requireUser(['super_admin', 'admin', 'doctor', 'nurse', 'receptionist', 'emergency']);
    const input = parsePatientInput(await readJsonBody(request, 64_000));
    if (!input) return NextResponse.json({ error: 'Patient data is invalid.' }, { status: 400 });
    
    const [newPatient] = await db.insert(patients).values(input).returning();

    await logAuditTrail(actor.id, 'Created Patient', 'Patients', `Created ${newPatient.patientCategory.toLowerCase()} patient record #${newPatient.id}`);

    return NextResponse.json(newPatient);
  } catch (error) {
    if (error instanceof RequestBodyError) return NextResponse.json({ error: error.message }, { status: error.status });
    console.error('Error creating patient:', error);
    return NextResponse.json({ error: 'Failed to create patient' }, { status: 500 });
  }
}
