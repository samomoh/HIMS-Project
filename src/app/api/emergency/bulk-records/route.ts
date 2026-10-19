import { NextResponse } from 'next/server';
import { db } from '@/db';
import { medicalRecords, labResults, imagingResults } from '@/db/schema';
import { requireUser } from '@/lib/auth';
import { readJsonBody, RequestBodyError } from '@/lib/request-json';

// Never evaluated at build time — DB access happens strictly per-request.
export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  try {
    const actor = await requireUser(['super_admin', 'admin', 'emergency', 'medical_records']);
    const payload: unknown = await readJsonBody(request);
    if (!payload || typeof payload !== 'object' || !Array.isArray((payload as { records?: unknown }).records)) {
      return NextResponse.json({ error: 'Invalid payload' }, { status: 400 });
    }
    const records = (payload as { records: unknown[] }).records;
    if (records.length === 0 || records.length > 100) return NextResponse.json({ error: 'Import between 1 and 100 records per request.' }, { status: 400 });
    const validRecords = records.filter((value): value is { patientId: number; recordType: string; description: string; resultOrFindings: string; date?: string } => {
      if (!value || typeof value !== 'object' || Array.isArray(value)) return false;
      const record = value as Record<string, unknown>;
      return Number.isSafeInteger(record.patientId) && Number(record.patientId) > 0
        && typeof record.recordType === 'string' && record.recordType.trim().length > 0 && record.recordType.length <= 100
        && typeof record.description === 'string' && record.description.trim().length > 0 && record.description.length <= 1000
        && typeof record.resultOrFindings === 'string' && record.resultOrFindings.trim().length > 0 && record.resultOrFindings.length <= 20000
        && (record.date === undefined || (typeof record.date === 'string' && !Number.isNaN(Date.parse(record.date))));
    });
    if (validRecords.length !== records.length) return NextResponse.json({ error: 'One or more records are invalid.' }, { status: 400 });

    await db.transaction(async (tx) => {
    for (const r of validRecords) {
      const type = r.recordType.toLowerCase();
      
      if (type.includes('lab')) {
        await db.insert(labResults).values({
          patientId: r.patientId,
          doctorId: actor.id,
          testName: `[EXTERNAL] ${r.description}`,
          result: r.resultOrFindings,
          status: 'Completed',
          priority: 'Routine',
          dateCompleted: new Date(r.date ?? Date.now()),
        });
      } else if (type.includes('imaging') || type.includes('scan') || type.includes('x-ray')) {
        await db.insert(imagingResults).values({
          patientId: r.patientId,
          doctorId: actor.id,
          procedureName: `[EXTERNAL] ${r.description}`,
          resultText: r.resultOrFindings,
          status: 'Completed',
          priority: 'Routine',
          dateCompleted: new Date(r.date ?? Date.now()),
        });
      } else {
        // Assume Diagnosis or General Medical History
        await db.insert(medicalRecords).values({
          patientId: r.patientId,
          doctorId: actor.id,
          diagnosis: `[EXTERNAL HISTORY] ${r.description}`,
          notes: r.resultOrFindings,
          recordDate: new Date(r.date ?? Date.now()),
        });
      }
    }
    });

    return NextResponse.json({ success: true, count: validRecords.length });
  } catch (error) {
    if (error instanceof RequestBodyError) return NextResponse.json({ error: error.message }, { status: error.status });
    console.error('Error batch importing external records:', error);
    return NextResponse.json({ error: 'Failed to import external records' }, { status: 500 });
  }
}
