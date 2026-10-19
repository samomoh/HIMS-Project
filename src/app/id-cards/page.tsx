import { db } from '@/db';
import { users } from '@/db/schema';
import { desc } from 'drizzle-orm';
import IDCardClient from './IDCardClient';

export const dynamic = 'force-dynamic';

export default async function IDCardsPage() {
  const staffMembers = await db.query.users.findMany({
    orderBy: [desc(users.createdAt)],
  });

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
