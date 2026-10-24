import type { Role } from '@/lib/session-token';

export const MENU_SETTING_KEY = 'CUSTOM_MENU_ITEMS';
export const MENU_ROLE_OPTIONS: Role[] = ['super_admin', 'admin', 'doctor', 'specialist', 'nurse', 'receptionist', 'pharmacist', 'laboratory', 'radiology', 'emergency', 'medical_records', 'health_authority', 'ict_support', 'hr'];

export const MENU_TARGETS = [
  { href: '/', label: 'Overview', roles: ['super_admin', 'admin', 'doctor', 'specialist', 'nurse', 'receptionist', 'pharmacist', 'laboratory', 'radiology', 'emergency', 'medical_records', 'health_authority', 'ict_support', 'hr'] },
  { href: '/patients', label: 'Patients', roles: ['super_admin', 'admin', 'doctor', 'specialist', 'nurse', 'receptionist', 'emergency', 'medical_records'] },
  { href: '/wards', label: 'Wards & admissions', roles: ['super_admin', 'admin', 'doctor', 'specialist', 'nurse', 'receptionist', 'emergency', 'pharmacist', 'laboratory', 'radiology', 'medical_records'] },
  { href: '/appointments', label: 'Appointments', roles: ['super_admin', 'admin', 'doctor', 'specialist', 'receptionist'] },
  { href: '/emergency', label: 'Emergency unit', roles: ['super_admin', 'admin', 'emergency', 'doctor', 'nurse'] },
  { href: '/physician', label: 'Physician desk', roles: ['super_admin', 'admin', 'doctor'] },
  { href: '/specialist', label: 'Specialist hub', roles: ['super_admin', 'admin', 'specialist'] },
  { href: '/nursing', label: 'Nursing station', roles: ['super_admin', 'admin', 'nurse'] },
  { href: '/laboratory', label: 'Laboratory', roles: ['super_admin', 'admin', 'doctor', 'specialist', 'laboratory', 'emergency'] },
  { href: '/radiology', label: 'Radiology', roles: ['super_admin', 'admin', 'doctor', 'specialist', 'radiology', 'emergency'] },
  { href: '/pharmacy', label: 'Pharmacy', roles: ['super_admin', 'admin', 'doctor', 'pharmacist'] },
  { href: '/records', label: 'Medical records', roles: ['super_admin', 'admin', 'medical_records'] },
  { href: '/billing', label: 'Billing', roles: ['super_admin', 'admin', 'receptionist'] },
  { href: '/reports', label: 'Reports', roles: ['super_admin', 'admin', 'medical_records', 'health_authority'] },
  { href: '/authorities', label: 'Health authorities', roles: ['super_admin', 'admin', 'health_authority'] },
  { href: '/ai-assistant', label: 'AI assistant', roles: ['super_admin', 'doctor', 'specialist', 'nurse', 'emergency'] },
  { href: '/staff', label: 'Staff', roles: ['super_admin', 'admin', 'hr'] },
  { href: '/shifts', label: 'Shift management', roles: ['super_admin', 'admin', 'hr', 'doctor', 'specialist', 'nurse', 'receptionist', 'pharmacist', 'laboratory', 'radiology', 'emergency', 'medical_records', 'health_authority', 'ict_support'] },
  { href: '/id-cards', label: 'ID cards', roles: ['super_admin', 'admin'] },
  { href: '/ict-support', label: 'ICT support', roles: ['super_admin', 'admin', 'ict_support'] },
  { href: '/audit-trail', label: 'Audit trail', roles: ['super_admin', 'admin', 'health_authority', 'ict_support'] },
  { href: '/settings', label: 'Settings', roles: ['super_admin', 'admin', 'doctor', 'specialist', 'nurse', 'receptionist', 'pharmacist', 'laboratory', 'radiology', 'emergency', 'medical_records', 'health_authority', 'ict_support'] },
] as const satisfies ReadonlyArray<{ href: string; label: string; roles: readonly Role[] }>;

export const MENU_ICONS = ['LayoutDashboard', 'Users', 'BedDouble', 'Calendar', 'Siren', 'Stethoscope', 'Microscope', 'ClipboardList', 'FlaskConical', 'Radiation', 'Pill', 'FolderArchive', 'CreditCard', 'FileText', 'Landmark', 'Bot', 'UserCog', 'CalendarClock', 'Badge', 'ServerCog', 'Eye', 'Settings'] as const;
export type MenuIconName = (typeof MENU_ICONS)[number];
export type CustomMenuItem = { id: string; name: string; href: string; icon: MenuIconName; roles: Role[] };

export function sanitizeCustomMenu(value: unknown): CustomMenuItem[] {
  if (!Array.isArray(value)) return [];
  return value.flatMap((entry) => {
    if (!entry || typeof entry !== 'object') return [];
    const item = entry as Record<string, unknown>;
    const target = MENU_TARGETS.find((candidate) => candidate.href === item.href);
    if (!target || typeof item.id !== 'string' || typeof item.name !== 'string' || !item.name.trim() || item.name.length > 40 || !MENU_ICONS.includes(item.icon as MenuIconName)) return [];
    const roles = Array.isArray(item.roles) ? item.roles.filter((role): role is Role => (target.roles as readonly Role[]).includes(role as Role)) : [];
    if (!roles.length) return [];
    return [{ id: item.id, name: item.name.trim(), href: target.href, icon: item.icon as MenuIconName, roles: [...new Set(roles)] }];
  }).slice(0, 20);
}
