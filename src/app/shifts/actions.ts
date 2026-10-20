'use server';

import { randomUUID } from 'node:crypto';
import { db } from '@/db';
import { staffShifts, users } from '@/db/schema';
import { and, eq, gte, lt, ne } from 'drizzle-orm';
import { revalidatePath } from 'next/cache';
import { requireUser } from '@/lib/auth';
import { logAuditTrail } from '@/lib/audit';

type ShiftInput = {
  staffId: number;
  shiftType: 'Morning' | 'Evening' | 'Night';
  startDate: string;
  endDate?: string;
  repeat: 'none' | 'daily' | 'weekly' | 'rotating';
  notes?: string;
};

const shiftHours: Record<ShiftInput['shiftType'], [number, number]> = {
  Morning: [7, 15],
  Evening: [15, 23],
  Night: [23, 7],
};

function dateOnly(value: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;
  const date = new Date(`${value}T00:00:00.000Z`);
  return Number.isNaN(date.getTime()) || date.toISOString().slice(0, 10) !== value ? null : date;
}

export async function createShiftScheduleAction(input: ShiftInput) {
  const actor = await requireUser(['super_admin', 'admin', 'hr']);
  if (!input || !Number.isSafeInteger(input.staffId) || input.staffId <= 0) throw new Error('Choose a staff member.');
  if (!['Morning', 'Evening', 'Night'].includes(input.shiftType)) throw new Error('Choose a valid shift.');
  if (!['none', 'daily', 'weekly', 'rotating'].includes(input.repeat)) throw new Error('Choose a valid schedule pattern.');
  if (input.notes != null && (typeof input.notes !== 'string' || input.notes.length > 500)) throw new Error('Notes must be 500 characters or fewer.');
  const start = dateOnly(input.startDate);
  const end = dateOnly(input.endDate || input.startDate);
  if (!start || !end || end < start) throw new Error('Enter a valid schedule date range.');
  const days = Math.round((end.getTime() - start.getTime()) / 86_400_000);
  if (days > 89) throw new Error('A schedule can cover up to 90 days at a time.');
  if (input.repeat === 'none' && days !== 0) throw new Error('Choose a single date or select a repeating schedule.');
  const [staff] = await db.select({ id: users.id, name: users.name, role: users.role })
    .from(users).where(and(eq(users.id, input.staffId), ne(users.role, 'patient'))).limit(1);
  if (!staff) throw new Error('That staff account could not be found.');

  const shiftTypes: ShiftInput['shiftType'][] = ['Morning', 'Evening', 'Night'];
  const rows: Array<{ staffId: number; shiftType: string; startsAt: Date; endsAt: Date; rotationId: string | null; notes: string | null; createdBy: number }> = [];
  const rotationId = input.repeat === 'rotating' ? randomUUID() : null;
  const stepDays = input.repeat === 'weekly' || input.repeat === 'rotating' ? 7 : 1;
  const rotationStart = shiftTypes.indexOf(input.shiftType);
  for (let day = 0, occurrence = 0; day <= days; day += input.repeat === 'none' ? 91 : stepDays, occurrence += 1) {
    const shiftType = input.repeat === 'rotating' ? shiftTypes[(rotationStart + occurrence) % shiftTypes.length] : input.shiftType;
    const date = new Date(start.getTime() + day * 86_400_000);
    const [startHour, endHour] = shiftHours[shiftType];
    const startsAt = new Date(date.getTime() + startHour * 3_600_000);
    const endsAt = new Date(date.getTime() + (endHour <= startHour ? endHour + 24 : endHour) * 3_600_000);
    rows.push({ staffId: staff.id, shiftType, startsAt, endsAt, rotationId, notes: input.notes?.trim() || null, createdBy: actor.id });
    if (rows.length > 90) throw new Error('This rotation creates too many shifts. Reduce the date range.');
  }

  const scheduleEnd = rows[rows.length - 1].endsAt;
  const existing = await db.select({ startsAt: staffShifts.startsAt, endsAt: staffShifts.endsAt })
    .from(staffShifts)
    .where(and(eq(staffShifts.staffId, staff.id), gte(staffShifts.endsAt, rows[0].startsAt), lt(staffShifts.startsAt, scheduleEnd)));
  if (rows.some((row) => existing.some((other) => row.startsAt < other.endsAt && row.endsAt > other.startsAt))) {
    throw new Error('This staff member already has a shift during that time. Review the existing schedule.');
  }

  await db.insert(staffShifts).values(rows);
  await logAuditTrail(actor.id, 'Created Shift Schedule', 'Shift Management', `Scheduled ${staff.name} for ${rows.length} shift${rows.length === 1 ? '' : 's'}${rotationId ? ' in a rotating pattern' : ''}.`);
  revalidatePath('/shifts');
  return { count: rows.length };
}

export async function deleteShiftAction(id: number) {
  const actor = await requireUser(['super_admin', 'admin', 'hr']);
  if (!Number.isSafeInteger(id) || id <= 0) throw new Error('Choose a valid shift to remove.');
  const [shift] = await db.select({ staffId: staffShifts.staffId, shiftType: staffShifts.shiftType, startsAt: staffShifts.startsAt })
    .from(staffShifts).where(eq(staffShifts.id, id)).limit(1);
  if (!shift) throw new Error('This shift no longer exists.');
  await db.delete(staffShifts).where(eq(staffShifts.id, id));
  await logAuditTrail(actor.id, 'Removed Shift', 'Shift Management', `Removed ${shift.shiftType} shift for staff ID ${shift.staffId} starting ${shift.startsAt.toISOString()}.`);
  revalidatePath('/shifts');
}
