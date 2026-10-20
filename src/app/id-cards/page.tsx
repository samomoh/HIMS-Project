import { db } from '@/db';
import { staffPhotos, users } from '@/db/schema';
import { desc, eq, ne } from 'drizzle-orm';
import IDCardClient from './IDCardClient';

export const dynamic = 'force-dynamic';

export default async function IDCardsPage() {
  const staffMembers = await db.select({
    id: users.id,
    name: users.name,
    email: users.email,
    role: users.role,
    department: users.department,
    contactNumber: users.contactNumber,
    hireDate: users.hireDate,
    licenseNumber: users.licenseNumber,
    photoMimeType: staffPhotos.photoMimeType,
    createdAt: users.createdAt,
  }).from(users).leftJoin(staffPhotos, eq(staffPhotos.userId, users.id)).where(ne(users.role, 'patient')).orderBy(desc(users.createdAt));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold leading-6 text-gray-900">Staff ID Cards</h1>
        <p className="mt-2 text-sm text-gray-700">
          Generate, preview, and print professionally secured staff identification cards.
        </p>
      </div>

      <IDCardClient staff={staffMembers} />
    </div>
  );
}
