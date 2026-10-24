import { db } from '@/db';
import { staffShifts, users } from '@/db/schema';
import { and, asc, eq, gte, lt, ne } from 'drizzle-orm';
import { currentUser } from '@/lib/auth';
import ShiftsClient from './ShiftsClient';

export const dynamic = 'force-dynamic';

export default async function ShiftsPage() {
  const actor = await currentUser();
  if (!actor) return null;
  const canManage = ['super_admin', 'admin', 'hr'].includes(actor.role);
  const now = new Date();
  const from = new Date(now.getTime() - 7 * 86_400_000);
  const through = new Date(now.getTime() + 31 * 86_400_000);
  const [staff, shifts] = await Promise.all([
    db.select({ id: users.id, name: users.name, role: users.role, department: users.department })
      .from(users).where(ne(users.role, 'patient')).orderBy(asc(users.name)),
    db.select({
      id: staffShifts.id,
      staffId: users.id,
      name: users.name,
      role: users.role,
      department: users.department,
      shiftType: staffShifts.shiftType,
      startsAt: staffShifts.startsAt,
      endsAt: staffShifts.endsAt,
      rotationId: staffShifts.rotationId,
      notes: staffShifts.notes,
    }).from(staffShifts)
      .innerJoin(users, and(eq(users.id, staffShifts.staffId), ne(users.role, 'patient')))
      .where(and(gte(staffShifts.endsAt, from), lt(staffShifts.startsAt, through)))
      .orderBy(asc(staffShifts.startsAt)),
  ]);
  return <ShiftsClient staff={staff} shifts={shifts} canManage={canManage} asOf={now} />;
}
