import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { NextResponse } from 'next/server';
import { eq } from 'drizzle-orm';
import { db } from '@/db';
import { labResults } from '@/db/schema';
import { requireUser } from '@/lib/auth';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const extensions = ['pdf', 'jpg', 'png', 'webp'] as const;
const contentTypes: Record<(typeof extensions)[number], string> = {
  pdf: 'application/pdf', jpg: 'image/jpeg', png: 'image/png', webp: 'image/webp',
};

export async function GET(request: Request) {
  await requireUser(['super_admin', 'admin', 'doctor', 'specialist', 'nurse', 'emergency', 'medical_records']);
  const { searchParams } = new URL(request.url);
  const id = Number(searchParams.get('id'));
  if (!Number.isSafeInteger(id) || id <= 0) return NextResponse.json({ error: 'Invalid report id.' }, { status: 400 });

  const lab = await db.query.labResults.findFirst({ where: eq(labResults.id, id) });
  const match = lab?.reportUrl?.match(new RegExp(`^/api/emergency/external-lab-file\\?id=${id}&format=(pdf|jpg|png|webp)$`));
  if (!lab || !lab.testName.startsWith('[EXTERNAL] ') || !match || !extensions.includes(match[1] as (typeof extensions)[number])) {
    return NextResponse.json({ error: 'External lab report not found.' }, { status: 404 });
  }

  const extension = match[1] as (typeof extensions)[number];
  try {
    const filePath = path.join(process.cwd(), 'private-uploads', 'external-labs', `${id}.${extension}`);
    const bytes = await readFile(filePath);
    return new Response(new Uint8Array(bytes), {
      headers: {
        'Content-Type': contentTypes[extension],
        'Content-Disposition': `inline; filename="external-lab-${id}.${extension}"`,
        'Cache-Control': 'private, no-store',
        'X-Content-Type-Options': 'nosniff',
      },
    });
  } catch {
    return NextResponse.json({ error: 'The stored report file could not be found.' }, { status: 404 });
  }
}
