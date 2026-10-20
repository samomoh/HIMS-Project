import { eq } from 'drizzle-orm';
import { NextResponse } from 'next/server';
import { db } from '@/db';
import { staffPhotos, users } from '@/db/schema';
import { currentUser } from '@/lib/auth';
import { logAuditTrail } from '@/lib/audit';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const MAX_PHOTO_SIZE = 5 * 1024 * 1024;
function detectPhotoType(bytes: Buffer): { mimeType: string } | null {
  if (bytes.subarray(0, 3).equals(Buffer.from([0xff, 0xd8, 0xff]))) return { mimeType: 'image/jpeg' };
  if (bytes.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))) return { mimeType: 'image/png' };
  if (bytes.subarray(0, 4).toString('ascii') === 'RIFF' && bytes.subarray(8, 12).toString('ascii') === 'WEBP') return { mimeType: 'image/webp' };
  return null;
}

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const actor = await currentUser();
  if (!actor) return NextResponse.json({ error: 'Authentication required.' }, { status: 401 });
  if (actor.role === 'patient') return NextResponse.json({ error: 'Staff access required.' }, { status: 403 });
  const { id: rawId } = await params;
  const id = Number(rawId);
  if (!Number.isSafeInteger(id) || id <= 0) return NextResponse.json({ error: 'Staff record not found.' }, { status: 404 });
  const [photo] = await db.select({ photoData: staffPhotos.photoData, photoMimeType: staffPhotos.photoMimeType })
    .from(staffPhotos).where(eq(staffPhotos.userId, id)).limit(1);
  if (!photo?.photoData || !photo.photoMimeType) {
    return NextResponse.json({ error: 'Staff photo not found.' }, { status: 404 });
  }
  return new Response(new Uint8Array(photo.photoData), {
    headers: { 'Content-Type': photo.photoMimeType, 'Cache-Control': 'private, no-store', 'X-Content-Type-Options': 'nosniff' },
  });
}

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const actor = await currentUser();
  if (!actor) return NextResponse.json({ error: 'Authentication required.' }, { status: 401 });
  if (actor.role !== 'super_admin') return NextResponse.json({ error: 'Only a super administrator can upload staff photos.' }, { status: 403 });
  const contentLength = Number(request.headers.get('content-length'));
  if (Number.isFinite(contentLength) && contentLength > MAX_PHOTO_SIZE + 128 * 1024) {
    return NextResponse.json({ error: 'Staff photo must be 5 MB or smaller.' }, { status: 413 });
  }
  const { id: rawId } = await params;
  const id = Number(rawId);
  if (!Number.isSafeInteger(id) || id <= 0) return NextResponse.json({ error: 'Invalid staff record.' }, { status: 400 });

  try {
    const formData = await request.formData();
    const file = formData.get('photo');
    if (!(file instanceof File) || file.size === 0 || file.size > MAX_PHOTO_SIZE) {
      return NextResponse.json({ error: 'Choose a staff photo no larger than 5 MB.' }, { status: 400 });
    }
    const bytes = Buffer.from(await file.arrayBuffer());
    const type = detectPhotoType(bytes);
    if (!type) return NextResponse.json({ error: 'Use a valid JPEG, PNG, or WebP image.' }, { status: 415 });
    const existing = await db.query.users.findFirst({ where: eq(users.id, id), columns: { id: true, role: true } });
    if (!existing || existing.role === 'patient') return NextResponse.json({ error: 'Staff record not found.' }, { status: 404 });

    await db.insert(staffPhotos).values({ userId: id, photoData: bytes, photoMimeType: type.mimeType })
      .onConflictDoUpdate({ target: staffPhotos.userId, set: { photoData: bytes, photoMimeType: type.mimeType, uploadedAt: new Date() } });
    await logAuditTrail(actor.id, 'Uploaded Staff Photo', 'Staff Management', `Uploaded a photo for staff member ID ${id}`);
    return NextResponse.json({ success: true, mimeType: type.mimeType });
  } catch (error) {
    console.error('Staff photo upload failed:', error);
    return NextResponse.json({ error: 'Could not save the staff photo. Please try again.' }, { status: 500 });
  }
}
