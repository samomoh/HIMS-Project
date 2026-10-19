import { NextResponse } from 'next/server';
import { db } from '@/db';
import { labResults } from '@/db/schema';
import { eq } from 'drizzle-orm';
import { formatLabRequest, formatLabReport, labDocFilename, type LabDoc } from '@/lib/lab-docs';
import { requireUser } from '@/lib/auth';

export const dynamic = 'force-dynamic';

// Streams a laboratory document (request form or result report) as a real
// attachment. Serving it from a route with Content-Disposition: attachment is
// what makes the download work reliably — including inside sandboxed preview
// iframes, where client-side blob/data-URL tricks get blocked.
export async function GET(request: Request) {
  await requireUser(['super_admin', 'admin', 'doctor', 'specialist', 'laboratory', 'emergency']);
  const { searchParams } = new URL(request.url);
  const kind = searchParams.get('kind');
  const idRaw = searchParams.get('id');
  const id = Number(idRaw);

  if (kind !== 'request' && kind !== 'report') {
    return NextResponse.json({ error: 'Invalid "kind". Use "request" or "report".' }, { status: 400 });
  }
  if (!Number.isInteger(id) || id <= 0) {
    return NextResponse.json({ error: 'A valid numeric "id" is required.' }, { status: 400 });
  }

  const lab = await db.query.labResults.findFirst({
    where: eq(labResults.id, id),
    with: { patient: true, doctor: true },
  });

  if (!lab || !lab.patient || !lab.doctor) {
    return NextResponse.json({ error: 'Laboratory record not found.' }, { status: 404 });
  }
  if (kind === 'report' && lab.status !== 'Completed') {
    return NextResponse.json({ error: 'The laboratory result has not been finalized.' }, { status: 409 });
  }

  const doc = lab as unknown as LabDoc;
  const body = kind === 'request' ? formatLabRequest(doc) : formatLabReport(doc);
  const filename = labDocFilename(kind, doc);

  return new Response(body, {
    status: 200,
    headers: {
      'Content-Type': 'text/plain; charset=utf-8',
      // filename* (RFC 5987) + filename fallback = safe across browsers.
      'Content-Disposition': `attachment; filename="${filename}"; filename*=UTF-8''${encodeURIComponent(filename)}`,
      'Cache-Control': 'no-store, private',
      'X-Content-Type-Options': 'nosniff',
    },
  });
}
