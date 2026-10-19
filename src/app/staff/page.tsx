import { db } from '@/db';
import { users } from '@/db/schema';
import { desc, ne } from 'drizzle-orm';
import StaffClient from './StaffClient';

export const dynamic = 'force-dynamic';

export default async function StaffPage() {
  // Exclude 'patient' role from staff management. Let's assume anyone not a patient is staff.
  const staffMembers = await db.query.users.findMany({
    where: ne(users.role, 'patient'),
    orderBy: [desc(users.createdAt)],
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold leading-6 text-gray-900">Staff Management</h1>
        <p className="mt-2 text-sm text-gray-700">
          Manage hospital staff, update their roles, and handle batch imports/exports.
        </p>
      </div>

      <StaffClient initialStaff={staffMembers} />
    </div>
  );
}
