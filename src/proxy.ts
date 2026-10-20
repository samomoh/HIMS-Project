import { NextRequest, NextResponse } from 'next/server';
import { Role, SESSION_COOKIE, verifySession } from '@/lib/session-token';

const permissions: Array<[string, Role[]]> = [
  ['/staff', ['super_admin', 'admin', 'hr']],
  ['/physician', ['super_admin', 'admin', 'doctor']],
  ['/specialist', ['super_admin', 'admin', 'specialist']],
  ['/nursing', ['super_admin', 'admin', 'nurse']],
  ['/laboratory', ['super_admin', 'admin', 'doctor', 'specialist', 'laboratory', 'emergency']],
  ['/radiology', ['super_admin', 'admin', 'doctor', 'specialist', 'radiology', 'emergency']],
  ['/pharmacy', ['super_admin', 'admin', 'doctor', 'pharmacist']],
  ['/billing', ['super_admin', 'admin', 'receptionist']],
  ['/records', ['super_admin', 'admin', 'medical_records']],
  ['/authorities', ['super_admin', 'admin', 'health_authority']],
  ['/ict-support', ['super_admin', 'admin', 'ict_support']],
  ['/id-cards', ['super_admin', 'admin']],
  ['/reports', ['super_admin', 'admin', 'medical_records', 'health_authority']],
  ['/audit-trail', ['super_admin', 'admin', 'health_authority', 'ict_support']],
  ['/ai-assistant', ['super_admin', 'doctor', 'specialist', 'nurse', 'emergency']],
  ['/emergency/external-lab', ['super_admin', 'admin', 'emergency', 'medical_records']],
  ['/emergency/external-lab-file', ['super_admin', 'admin', 'doctor', 'specialist', 'nurse', 'emergency', 'medical_records']],
  ['/emergency', ['super_admin', 'admin', 'emergency', 'doctor', 'nurse']],
  ['/appointments', ['super_admin', 'admin', 'doctor', 'specialist', 'receptionist']],
  ['/patients', ['super_admin', 'admin', 'doctor', 'specialist', 'nurse', 'receptionist', 'emergency', 'medical_records']],
  ['/settings', ['super_admin', 'admin', 'doctor', 'specialist', 'nurse', 'receptionist', 'pharmacist', 'laboratory', 'radiology', 'emergency', 'medical_records', 'health_authority', 'ict_support']],
  ['/', ['super_admin', 'admin', 'doctor', 'specialist', 'nurse', 'receptionist', 'pharmacist', 'laboratory', 'radiology', 'emergency', 'medical_records', 'health_authority', 'ict_support', 'hr']],
];

const isPublic = (path: string) =>
  path === '/api/health' || path === '/auth/login' || path === '/auth/reset-password' || path === '/unauthorized';

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  if (isPublic(pathname)) {
    const requestHeaders = new Headers(request.headers);
    requestHeaders.set('x-hmis-path', pathname);
    return NextResponse.next({ request: { headers: requestHeaders } });
  }

  const session = verifySession(request.cookies.get(SESSION_COOKIE)?.value);
  const isApi = pathname.startsWith('/api/');
  if (!session) {
    if (isApi) return NextResponse.json({ error: 'Authentication required.' }, { status: 401 });
    const login = new URL('/auth/login', request.url);
    login.searchParams.set('next', `${pathname}${request.nextUrl.search}`);
    return NextResponse.redirect(login);
  }

  const policyPath = isApi ? pathname.replace(/^\/api/, '') : pathname;
  const access = permissions.find(([prefix]) => prefix === '/' ? policyPath === '/' : policyPath === prefix || policyPath.startsWith(`${prefix}/`));
  if (!access) {
    if (isApi) return NextResponse.json({ error: 'Not found.' }, { status: 404 });
    return NextResponse.redirect(new URL('/unauthorized', request.url));
  }
  if (access && !access[1].includes(session.role)) {
    if (isApi) return NextResponse.json({ error: 'You do not have permission to access this resource.' }, { status: 403 });
    return NextResponse.redirect(new URL('/unauthorized', request.url));
  }
  const requestHeaders = new Headers(request.headers);
  requestHeaders.set('x-hmis-path', pathname);
  return NextResponse.next({ request: { headers: requestHeaders } });
}

export const config = { matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'] };
