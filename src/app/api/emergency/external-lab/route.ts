import { mkdir, unlink, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { NextResponse } from 'next/server';
import { eq } from 'drizzle-orm';
import { db } from '@/db';
import { labResults, patients } from '@/db/schema';
import { logAuditTrail } from '@/lib/audit';
import { requireUser } from '@/lib/auth';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const MAX_FILE_SIZE = 15 * 1024 * 1024;
const storageDirectory = () => path.join(process.cwd(), 'private-uploads', 'external-labs');

function detectReportType(bytes: Buffer): { extension: string; mimeType: string } | null {
  if (bytes.subarray(0, 5).toString('ascii') === '%PDF-') return { extension: 'pdf', mimeType: 'application/pdf' };
  if (bytes.subarray(0, 3).equals(Buffer.from([0xff, 0xd8, 0xff]))) return { extension: 'jpg', mimeType: 'image/jpeg' };
  if (bytes.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))) return { extension: 'png', mimeType: 'image/png' };
  if (bytes.subarray(0, 4).toString('ascii') === 'RIFF' && bytes.subarray(8, 12).toString('ascii') === 'WEBP') return { extension: 'webp', mimeType: 'image/webp' };
  return null;
}

export async function POST(request: Request) {
  const actor = await requireUser(['super_admin', 'admin', 'emergency', 'medical_records']);
  const contentLength = Number(request.headers.get('content-length'));
  if (Number.isFinite(contentLength) && contentLength > MAX_FILE_SIZE + 128 * 1024) {
    return NextResponse.json({ error: 'Report file must be 15 MB or smaller.' }, { status: 413 });
  }
  let insertedLabId: number | null = null;
  let storedPath: string | null = null;

  try {
    const formData = await request.formData();
    const patientId = Number(formData.get('patientId'));
    const testName = formData.get('testName');
    const reportDateValue = formData.get('reportDate');
    const reportDate = reportDateValue === '' ? null : reportDateValue;
    const notes = formData.get('notes');
    const file = formData.get('file');

    if (!Number.isSafeInteger(patientId) || patientId <= 0
      || typeof testName !== 'string' || !testName.trim() || testName.trim().length > 244
      || (reportDate !== null && (typeof reportDate !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(reportDate) || Number.isNaN(Date.parse(`${reportDate}T00:00:00Z`)) || new Date(`${reportDate}T00:00:00Z`).toISOString().slice(0, 10) !== reportDate))
      || typeof notes !== 'string' || notes.length > 5000
      || !(file instanceof File) || file.size === 0 || file.size > MAX_FILE_SIZE) {
      return NextResponse.json({ error: 'Provide a patient, test name, valid report date, and a PDF or image up to 15 MB.' }, { status: 400 });
    }

    const patient = await db.query.patients.findFirst({ where: eq(patients.id, patientId) });
    if (!patient) return NextResponse.json({ error: 'Patient record not found.' }, { status: 404 });

    const bytes = Buffer.from(await file.arrayBuffer());
    const type = detectReportType(bytes);
    if (!type) return NextResponse.json({ error: 'Unsupported file content. Upload a PDF, JPEG, PNG, or WebP report.' }, { status: 415 });

    const [lab] = await db.insert(labResults).values({
      patientId,
      doctorId: actor.id,
      testName: `[EXTERNAL] ${testName.trim()}`,
      result: notes.trim() || 'Uploaded external lab report. Open the attached document to review.',
      status: 'Completed',
      priority: 'Routine',
      dateCompleted: reportDate ? new Date(`${reportDate}T12:00:00Z`) : new Date(),
    }).returning({ id: labResults.id });
    if (!lab) return NextResponse.json({ error: 'Could not create the external lab record.' }, { status: 500 });
    insertedLabId = lab.id;

    await mkdir(storageDirectory(), { recursive: true });
    storedPath = path.join(storageDirectory(), `${lab.id}.${type.extension}`);
    await writeFile(storedPath, bytes, { flag: 'wx', mode: 0o600 });
    const reportUrl = `/api/emergency/external-lab-file?id=${lab.id}&format=${type.extension}`;
    await db.update(labResults).set({ reportUrl }).where(eq(labResults.id, lab.id));

    try {
      await logAuditTrail(actor.id, 'Uploaded External Lab Report', 'Emergency', `Attached external lab report to patient #${patientId}`);
    } catch (auditError) {
      console.error('External lab report audit logging failed:', auditError);
    }

    return NextResponse.json({ success: true, labId: lab.id });
  } catch (error) {
    if (storedPath) await unlink(storedPath).catch(() => undefined);
    if (insertedLabId !== null) await db.delete(labResults).where(eq(labResults.id, insertedLabId)).catch(() => undefined);
    console.error('Error uploading external lab report:', error);
    return NextResponse.json({ error: 'Could not save the external lab report. Please try again.' }, { status: 500 });
  }
}
