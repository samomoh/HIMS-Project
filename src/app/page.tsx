import { and, asc, count, eq, gte, lt, sql } from 'drizzle-orm';
import { Activity, ArrowUpRight, BedDouble, Building2, CalendarDays, ClipboardList, FilePlus2, UserPlus, Users } from 'lucide-react';
import Link from 'next/link';
import type { ReactNode } from 'react';
import { db } from '@/db';
import { appointments, patients, users, wardAdmissions, wardBeds } from '@/db/schema';
import { requireUser } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export default async function DashboardPage() {
  const actor = await requireUser();
  const canSeeAppointments = ['super_admin', 'admin', 'doctor', 'specialist', 'nurse', 'receptionist', 'emergency', 'medical_records'].includes(actor.role);
  const canSeeStaffAndDepartments = ['super_admin', 'admin', 'hr'].includes(actor.role);
  const canSeeBeds = ['super_admin', 'admin', 'doctor', 'specialist', 'nurse', 'emergency', 'receptionist'].includes(actor.role);
  const now = new Date();
  const dayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const dayEnd = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);

  const [
    [{ totalPatients }], [{ activeAdmissions }], [{ todayAppointments }], [{ availableBeds }],
    [{ totalBeds }], [{ occupiedBeds }], [{ staffCount }], [{ departmentCount }], todayList,
  ] = await Promise.all([
    db.select({ totalPatients: count() }).from(patients),
    db.select({ activeAdmissions: count() }).from(wardAdmissions).where(eq(wardAdmissions.status, 'Admitted')),
    db.select({ todayAppointments: count() }).from(appointments).where(and(gte(appointments.appointmentDate, dayStart), lt(appointments.appointmentDate, dayEnd), sql`${appointments.status} != 'Cancelled'`)),
    db.select({ availableBeds: count() }).from(wardBeds).where(eq(wardBeds.status, 'Available')),
    db.select({ totalBeds: count() }).from(wardBeds),
    db.select({ occupiedBeds: count() }).from(wardBeds).where(eq(wardBeds.status, 'Occupied')),
    canSeeStaffAndDepartments ? db.select({ staffCount: count() }).from(users).where(sql`${users.role} != 'patient'`) : Promise.resolve([{ staffCount: 0 }]),
    canSeeStaffAndDepartments ? db.select({ departmentCount: sql<number>`count(distinct ${users.department})` }).from(users).where(sql`${users.role} != 'patient' and ${users.department} is not null and trim(${users.department}) <> ''`) : Promise.resolve([{ departmentCount: 0 }]),
    canSeeAppointments ? db.query.appointments.findMany({
      where: and(gte(appointments.appointmentDate, dayStart), lt(appointments.appointmentDate, dayEnd), sql`${appointments.status} != 'Cancelled'`),
      with: { patient: true, doctor: true }, orderBy: [asc(appointments.appointmentDate)], limit: 6,
    }) : Promise.resolve([]),
  ]);
  const occupancy = totalBeds ? Math.round((occupiedBeds / totalBeds) * 100) : 0;

  const stats = [
    { label: 'Total patients', value: totalPatients, detail: 'Registered in the system', icon: Users, edge: 'bg-blue-500', badge: 'bg-blue-500 shadow-blue-500/20' },
    { label: 'Active admissions', value: activeAdmissions, detail: 'Currently admitted', icon: ClipboardList, edge: 'bg-orange-500', badge: 'bg-orange-500 shadow-orange-500/20' },
    { label: "Today's appointments", value: todayAppointments, detail: 'Scheduled for today', icon: CalendarDays, edge: 'bg-green-500', badge: 'bg-green-500 shadow-green-500/20' },
    { label: 'Available beds', value: canSeeBeds ? availableBeds : '—', detail: `${occupancy}% occupancy`, icon: BedDouble, edge: 'bg-teal-500', badge: 'bg-teal-500 shadow-teal-500/20' },
  ];

  const actions = [
    ...(['super_admin', 'admin', 'receptionist', 'doctor', 'specialist', 'nurse', 'emergency'].includes(actor.role) ? [{ label: 'Register new patient', href: '/patients/new', icon: UserPlus, className: 'bg-blue-50 text-blue-800 hover:border-blue-200 hover:bg-blue-100' }] : []),
    ...(canSeeAppointments ? [{ label: 'Schedule appointment', href: '/appointments/new', icon: CalendarDays, className: 'bg-green-50 text-green-800 hover:border-green-200 hover:bg-green-100' }] : []),
    ...(['super_admin', 'admin', 'doctor', 'specialist', 'medical_records'].includes(actor.role) ? [{ label: 'Open medical records', href: '/records', icon: FilePlus2, className: 'bg-teal-50 text-teal-800 hover:border-teal-200 hover:bg-teal-100' }] : []),
    ...(['super_admin', 'admin', 'doctor', 'specialist', 'nurse', 'emergency'].includes(actor.role) ? [{ label: 'Manage admissions', href: '/wards', icon: ClipboardList, className: 'bg-orange-50 text-orange-800 hover:border-orange-200 hover:bg-orange-100' }] : []),
  ];

  const todayLabel = new Intl.DateTimeFormat('en', { weekday: 'long', month: 'long', day: 'numeric' }).format(now);

  return <main className="space-y-8 pb-4">
    <header className="flex flex-wrap items-end justify-between gap-4">
      <div><p className="mb-2 inline-flex items-center gap-2 rounded-full bg-teal-50 px-3 py-1 text-[11px] font-bold uppercase tracking-[.14em] text-teal-800"><Activity className="h-3.5 w-3.5" /> Hospital operations</p><h1 className="text-3xl font-bold tracking-tight text-slate-950">Dashboard</h1><p className="mt-2 text-base text-slate-600">Welcome to Connaught Hospital Management System</p></div>
      <div className="rounded-xl border border-slate-200 bg-white px-4 py-3 text-right shadow-sm"><p className="text-[10px] font-bold uppercase tracking-[.12em] text-slate-400">Today</p><p className="mt-1 text-sm font-semibold text-slate-800">{todayLabel}</p></div>
    </header>

    <section aria-label="Hospital summary" className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
      {stats.map((stat) => <article key={stat.label} className="group relative overflow-hidden rounded-2xl border border-slate-200/80 bg-white p-5 shadow-[0_3px_12px_rgba(15,23,42,.045)] transition hover:-translate-y-0.5 hover:shadow-lg sm:p-6"><div className={`absolute inset-x-0 top-0 h-1 ${stat.edge}`} /><div className="flex items-start justify-between gap-3"><div className="min-w-0"><p className="text-sm font-medium text-slate-600">{stat.label}</p><p className="mt-3 text-4xl font-bold tracking-tight text-slate-950">{stat.value}</p></div><span className={`grid h-14 w-14 shrink-0 place-items-center rounded-2xl text-white shadow-lg ${stat.badge}`}><stat.icon className="h-7 w-7" strokeWidth={2.3} /></span></div><p className="mt-4 text-xs text-slate-500">{stat.detail}</p></article>)}
    </section>

    <section aria-label="Dashboard details" className="grid gap-5 xl:grid-cols-[1fr_1fr_1.06fr]">
      <article className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-[0_3px_12px_rgba(15,23,42,.045)] sm:p-6"><div className="mb-5 flex items-center gap-3"><span className="grid h-10 w-10 place-items-center rounded-xl bg-blue-50 text-blue-700"><Activity className="h-5 w-5" /></span><div><h2 className="text-lg font-bold text-slate-950">Quick actions</h2><p className="text-xs text-slate-500">Common tasks for your role</p></div></div><div className="space-y-3">{actions.map((action) => <Link key={action.label} href={action.href} className={`group flex min-h-14 items-center justify-between gap-3 rounded-xl border border-transparent px-4 py-3 text-sm font-semibold transition ${action.className}`}><span className="flex items-center gap-3"><action.icon className="h-5 w-5" />{action.label}</span><ArrowUpRight className="h-4 w-4 opacity-0 transition group-hover:translate-x-0.5 group-hover:-translate-y-0.5 group-hover:opacity-100" /></Link>)}{!actions.length && <p className="rounded-xl bg-slate-50 p-4 text-sm text-slate-500">No quick actions are assigned to this role.</p>}</div></article>

      <article className="overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-[0_3px_12px_rgba(15,23,42,.045)]"><div className="flex items-center justify-between border-b border-slate-100 px-5 py-5 sm:px-6"><div className="flex items-center gap-3"><span className="grid h-10 w-10 place-items-center rounded-xl bg-green-50 text-green-700"><CalendarDays className="h-5 w-5" /></span><div><h2 className="text-lg font-bold text-slate-950">Today’s appointments</h2><p className="text-xs text-slate-500">{todayAppointments} scheduled today</p></div></div><Link href="/appointments" aria-label="View all appointments" className="rounded-lg p-2 text-slate-400 transition hover:bg-slate-50 hover:text-blue-700"><ArrowUpRight className="h-5 w-5" /></Link></div><div className="divide-y divide-slate-100">{!canSeeAppointments ? <p className="p-6 text-sm text-slate-500">Appointment details are not available for your role.</p> : todayList.length ? todayList.map((appointment) => <div key={appointment.id} className="flex items-center gap-3 px-5 py-4 sm:px-6"><div className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-green-50 text-xs font-bold text-green-800">{new Date(appointment.appointmentDate).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</div><div className="min-w-0 flex-1"><p className="truncate text-sm font-semibold text-slate-900">{appointment.patient.firstName} {appointment.patient.lastName}</p><p className="mt-0.5 truncate text-xs text-slate-500">{appointment.doctor.name}{appointment.reason ? ` · ${appointment.reason}` : ''}</p></div><span className={`rounded-full px-2.5 py-1 text-[10px] font-semibold ${appointment.status === 'Completed' ? 'bg-green-50 text-green-700' : appointment.status === 'In Progress' ? 'bg-blue-50 text-blue-700' : 'bg-slate-100 text-slate-600'}`}>{appointment.status}</span></div>) : <div className="flex min-h-48 flex-col items-center justify-center px-6 text-center"><span className="mb-3 grid h-12 w-12 place-items-center rounded-2xl bg-green-50 text-green-700"><CalendarDays className="h-6 w-6" /></span><p className="text-sm font-semibold text-slate-700">No appointments scheduled for today</p><p className="mt-1 text-xs text-slate-500">Your schedule is clear.</p></div>}</div></article>

      <article className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-[0_3px_12px_rgba(15,23,42,.045)] sm:p-6"><div className="mb-5 flex items-center gap-3"><span className="grid h-10 w-10 place-items-center rounded-xl bg-teal-50 text-teal-700"><Building2 className="h-5 w-5" /></span><div><h2 className="text-lg font-bold text-slate-950">Hospital overview</h2><p className="text-xs text-slate-500">Current capacity and resources</p></div></div><div className="space-y-3">{canSeeStaffAndDepartments && <><OverviewRow icon={<Users className="h-5 w-5" />} label="Total staff" value={staffCount} tone="blue" /><OverviewRow icon={<Building2 className="h-5 w-5" />} label="Departments" value={departmentCount} tone="teal" /></>}<OverviewRow icon={<BedDouble className="h-5 w-5" />} label="Bed occupancy" value={canSeeBeds ? `${occupancy}%` : '—'} tone="orange" /><div className="mt-5 flex items-center justify-between border-t border-slate-100 pt-4"><span className="text-sm text-slate-600">System status</span><span className="inline-flex items-center gap-2 text-sm font-semibold text-green-700"><i className="h-2 w-2 rounded-full bg-green-500 shadow-[0_0_0_4px_rgba(34,197,94,.12)]" />Operational</span></div></div></article>
    </section>
  </main>;
}

function OverviewRow({ icon, label, value, tone }: { icon: ReactNode; label: string; value: number | string; tone: 'blue' | 'teal' | 'orange' }) {
  const styles = { blue: 'bg-blue-50 text-blue-700', teal: 'bg-teal-50 text-teal-700', orange: 'bg-orange-50 text-orange-700' };
  return <div className={`flex items-center justify-between rounded-xl px-4 py-3.5 ${styles[tone]}`}><span className="flex items-center gap-3 text-sm font-medium"><span>{icon}</span>{label}</span><strong className="text-lg font-bold">{value}</strong></div>;
}
