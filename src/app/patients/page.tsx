import { db } from '@/db';
import { patients } from '@/db/schema';
import { desc, ilike, or } from 'drizzle-orm';
import PatientsClient from './PatientsClient';
import { currentUser } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export default async function PatientsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>
}) {
  const query = (await searchParams).q;
  const actor = await currentUser();

  let patientsData;
  if (query) {
    patientsData = await db.query.patients.findMany({
      where: or(
        ilike(patients.firstName, `%${query}%`),
        ilike(patients.lastName, `%${query}%`),
        ilike(patients.contact, `%${query}%`)
      ),
      orderBy: [desc(patients.createdAt)],
    });
  } else {
    patientsData = await db.query.patients.findMany({
      orderBy: [desc(patients.createdAt)],
    });
  }

  // Need to cast the data types properly so the client doesn't complain
  const formattedPatients = patientsData.map(p => ({
    id: p.id,
    firstName: p.firstName,
    lastName: p.lastName,
    dob: typeof p.dob === 'string' ? p.dob : new Date(p.dob as any).toISOString().split('T')[0],
    gender: p.gender,
    contact: p.contact,
    patientCategory: p.patientCategory,
    bloodGroup: p.bloodGroup,
    createdAt: p.createdAt
  }));

  return (
    <PatientsClient initialPatients={formattedPatients} query={query} canDelete={actor?.role === 'admin' || actor?.role === 'super_admin'} />
  );
}
