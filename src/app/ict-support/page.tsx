import { db } from '@/db';
import { supportTickets, users } from '@/db/schema';
import { desc, eq, ne } from 'drizzle-orm';
import ICTClient from './ICTClient';

export const dynamic = 'force-dynamic';

export default async function ICTSupportPage() {
  const tickets = await db.query.supportTickets.findMany({
    with: { user: true },
    orderBy: [desc(supportTickets.createdAt)],
  });

  const allUsers = await db.query.users.findMany({
    where: ne(users.role, 'patient'),
    orderBy: [desc(users.createdAt)]
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold leading-6 text-gray-900">ICT Technical Support</h1>
        <p className="mt-2 text-sm text-gray-700">
          Troubleshoot issues, assist users, and monitor application health and integrations.
        </p>
      </div>

      <ICTClient tickets={tickets} users={allUsers} />
    </div>
  );
}
