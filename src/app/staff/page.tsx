import { db } from '@/db';
import { staffPhotos, users } from '@/db/schema';
import { desc, eq, notInArray, ne } from 'drizzle-orm';
import StaffClient from './StaffClient';
import { currentUser } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export default async function StaffPage() {
  const actor = await currentUser();
  if (!actor) return null;
  // HR and admins can manage staff records but should not browse privileged admin accounts.
  const staffFilter = actor.role === 'super_admin'
    ? ne(users.role, 'patient')
    : notInArray(users.role, ['patient', 'admin', 'super_admin']);
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
  }).from(users).leftJoin(staffPhotos, eq(staffPhotos.userId, users.id)).where(staffFilter).orderBy(desc(users.createdAt));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold leading-6 text-gray-900">Staff Management</h1>
        <p className="mt-2 text-sm text-gray-700">
          Admins and HR can update staff contact details. Super admins can also manage accounts and roles.
        </p>
      </div>

      <StaffClient initialStaff={staffMembers} actorRole={actor.role} actorId={actor.id} />
    </div>
  );
}
