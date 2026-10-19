'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  Activity, Calendar, Users, FileText, Settings, Menu, X, HeartPulse, Pill,
  CreditCard, Bot, UserCog, FlaskConical, Radiation, ClipboardList,
  Stethoscope, Microscope, Siren, FolderArchive, Landmark, Eye, ServerCog,
  Badge, Search, Bell, LayoutDashboard, ShieldCheck, LogOut,
} from 'lucide-react';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';
import type { Role } from '@/lib/session-token';
import { signOutAction } from '@/app/auth/login/actions';

export function cn(...inputs: (string | undefined | null | false)[]) {
  return twMerge(clsx(inputs));
}

const navigation = [
  { name: 'Overview', href: '/', icon: LayoutDashboard, roles: ['super_admin', 'admin', 'doctor', 'specialist', 'nurse', 'receptionist', 'pharmacist', 'laboratory', 'radiology', 'emergency', 'medical_records', 'health_authority', 'ict_support'] },
  { name: 'Patients', href: '/patients', icon: Users, roles: ['super_admin', 'admin', 'doctor', 'specialist', 'nurse', 'receptionist', 'emergency', 'medical_records'] },
  { name: 'Appointments', href: '/appointments', icon: Calendar, roles: ['super_admin', 'admin', 'doctor', 'specialist', 'receptionist'] },
  { name: 'Emergency unit', href: '/emergency', icon: Siren, roles: ['super_admin', 'admin', 'emergency', 'doctor', 'nurse'] },
  { name: 'Physician desk', href: '/physician', icon: Stethoscope, roles: ['super_admin', 'admin', 'doctor'] },
  { name: 'Specialist hub', href: '/specialist', icon: Microscope, roles: ['super_admin', 'admin', 'specialist'] },
  { name: 'Nursing station', href: '/nursing', icon: ClipboardList, roles: ['super_admin', 'admin', 'nurse'] },
  { name: 'Laboratory', href: '/laboratory', icon: FlaskConical, roles: ['super_admin', 'admin', 'doctor', 'specialist', 'laboratory', 'emergency'] },
  { name: 'Radiology', href: '/radiology', icon: Radiation, roles: ['super_admin', 'admin', 'doctor', 'specialist', 'radiology', 'emergency'] },
  { name: 'Pharmacy', href: '/pharmacy', icon: Pill, roles: ['super_admin', 'admin', 'doctor', 'pharmacist'] },
  { name: 'Medical records', href: '/records', icon: FolderArchive, roles: ['super_admin', 'admin', 'medical_records'] },
  { name: 'Billing', href: '/billing', icon: CreditCard, roles: ['super_admin', 'admin', 'receptionist'] },
  { name: 'Reports', href: '/reports', icon: FileText, roles: ['super_admin', 'admin', 'medical_records', 'health_authority'] },
  { name: 'Health authorities', href: '/authorities', icon: Landmark, roles: ['super_admin', 'admin', 'health_authority'] },
  { name: 'AI assistant', href: '/ai-assistant', icon: Bot, roles: ['super_admin', 'doctor', 'specialist', 'nurse', 'emergency'] },
  { name: 'Staff', href: '/staff', icon: UserCog, roles: ['super_admin'] },
  { name: 'ID cards', href: '/id-cards', icon: Badge, roles: ['super_admin', 'admin'] },
  { name: 'ICT support', href: '/ict-support', icon: ServerCog, roles: ['super_admin', 'admin', 'ict_support'] },
  { name: 'Audit trail', href: '/audit-trail', icon: Eye, roles: ['super_admin', 'admin', 'health_authority', 'ict_support'] },
  { name: 'Settings', href: '/settings', icon: Settings, roles: ['super_admin', 'admin', 'doctor', 'specialist', 'nurse', 'receptionist', 'pharmacist', 'laboratory', 'radiology', 'emergency', 'medical_records', 'health_authority', 'ict_support'] },
];

const roleLabels: Record<string, string> = {
  super_admin: 'Super administrator', admin: 'Administrator', doctor: 'Physician',
  specialist: 'Specialist', nurse: 'Nurse', receptionist: 'Reception',
  pharmacist: 'Pharmacy', laboratory: 'Laboratory', radiology: 'Radiology',
  emergency: 'Emergency staff', medical_records: 'Medical records',
  health_authority: 'Health authority', ict_support: 'ICT support',
};

function Sidebar({ onNavigate, mobile = false, role }: { onNavigate?: () => void; mobile?: boolean; role: Role }) {
  const pathname = usePathname();
  const visibleNavigation = navigation.filter((item) => item.roles.includes(role));
  const careLinks = visibleNavigation.filter((item) => ['/','/patients','/appointments','/emergency','/physician','/specialist','/nursing'].includes(item.href));
  const serviceLinks = visibleNavigation.filter((item) => ['/laboratory','/radiology','/pharmacy','/records','/billing'].includes(item.href));
  const adminLinks = visibleNavigation.filter((item) => !careLinks.includes(item) && !serviceLinks.includes(item));

  const linkGroup = (label: string, links: typeof navigation) => links.length ? (
    <div className="mb-6" key={label}>
      <p className="sidebar-label">{label}</p>
      <nav className="space-y-1" aria-label={label}>
        {links.map((item) => {
          const active = item.href === '/' ? pathname === '/' : pathname?.startsWith(item.href);
          return (
            <Link key={item.href} href={item.href} onClick={onNavigate} aria-current={active ? 'page' : undefined}
              className={cn('nav-link', active && 'nav-link-active')}>
              <item.icon size={18} strokeWidth={active ? 2.2 : 1.8} aria-hidden="true" />
              <span>{item.name}</span>
              {active && <span className="nav-active-dot" />}
            </Link>
          );
        })}
      </nav>
    </div>
  ) : null;

  return (
    <aside className={cn('app-sidebar', mobile && 'app-sidebar-mobile')}>
      <Link href="/" className="brand" onClick={onNavigate} aria-label="HealthAI home">
        <span className="brand-mark"><HeartPulse size={21} strokeWidth={2.2} /></span>
        <span className="brand-copy"><strong>Health<span>AI</span></strong><small>CARE MANAGEMENT</small></span>
      </Link>
      <div className="sidebar-scroll">
        {linkGroup('Care', careLinks)}
        {linkGroup('Services', serviceLinks)}
        {linkGroup('Administration', adminLinks)}
      </div>
      <div className="sidebar-bottom">
        <div className="secure-note"><ShieldCheck size={16} /><span>Secure workspace</span><span className="secure-indicator" /></div>
        <span className="role-picker-label">Signed in as</span>
        <div className="identity-chip"><span className="identity-mark">{roleLabels[role].slice(0, 1)}</span><strong>{roleLabels[role]}</strong></div>
      </div>
    </aside>
  );
}

export function AppLayout({ children, role }: { children: React.ReactNode; role: Role }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const pathname = usePathname();
  if (pathname?.startsWith('/auth/') || pathname === '/unauthorized') return <>{children}</>;
  const current = navigation.find((item) => item.href === '/' ? pathname === '/' : pathname?.startsWith(item.href));
  const pageTitle = current?.name ?? 'HealthAI';

  return (
    <div className="app-frame">
      <div className={cn('mobile-scrim', sidebarOpen && 'mobile-scrim-visible')} onClick={() => setSidebarOpen(false)} aria-hidden="true" />
      <div className={cn('mobile-sidebar', sidebarOpen && 'mobile-sidebar-open')}>
        <button className="mobile-close" onClick={() => setSidebarOpen(false)} aria-label="Close navigation"><X size={20} /></button>
        <Sidebar mobile role={role} onNavigate={() => setSidebarOpen(false)} />
      </div>
      <div className="desktop-sidebar"><Sidebar role={role} /></div>
      <div className="app-main">
        <header className="topbar">
          <div className="topbar-left">
            <button className="mobile-menu" onClick={() => setSidebarOpen(true)} aria-label="Open navigation"><Menu size={21} /></button>
            <div className="breadcrumb"><span>Workspace</span><span className="breadcrumb-slash">/</span><strong>{pageTitle}</strong></div>
          </div>
          <div className="topbar-actions">
            <div className="topbar-search"><Search size={16} /><span>Search workspace</span><kbd>⌘ K</kbd></div>
            <span className="topbar-divider" />
            <button className="icon-button" aria-label="Notifications"><Bell size={18} /><i /></button>
            <button className="sign-out" onClick={async () => { await signOutAction(); window.location.assign('/auth/login'); }} aria-label="Sign out"><LogOut size={16} /><span>Sign out</span></button>
          </div>
        </header>
        <main className="page-content">{children}</main>
        <footer className="app-footer"><span>HealthAI HMIS</span><span>Care teams, connected.</span><span className="footer-status"><Activity size={13} /> All systems operational</span></footer>
      </div>
    </div>
  );
}
