import type { Metadata } from "next";
import type { ReactNode } from "react";
import { headers } from 'next/headers';
import { redirect } from 'next/navigation';
import "./globals.css";
import { AppLayout } from "@/components/layout/AppLayout";
import { currentUser } from '@/lib/auth';
import { db } from '@/db';
import { systemSettings } from '@/db/schema';
import { MENU_SETTING_KEY, sanitizeCustomMenu, type CustomMenuItem } from '@/lib/custom-navigation';
import { eq } from 'drizzle-orm';
import { WORKFLOW_DEFINITIONS_KEY, parseWorkflows } from '@/lib/workflow-studio';

export const metadata: Metadata = {
  title: "HealthAI HMIS",
  description: "AI-Powered Hospital Management Information System",
};

export default async function RootLayout({ children }: { children: ReactNode }) {
  const path = (await headers()).get('x-hmis-path') ?? '/';
  const isPublicPage = path.startsWith('/auth/') || path === '/unauthorized';
  const user = isPublicPage ? null : await currentUser();
  if (!isPublicPage && !user) redirect('/auth/login');
  let customNavigation: CustomMenuItem[] = [];
  let workflows: { id: string; name: string }[] = [];
  if (user) {
    const [setting, workflowSetting] = await Promise.all([
      db.query.systemSettings.findFirst({ where: eq(systemSettings.settingKey, MENU_SETTING_KEY) }),
      user.role === 'super_admin' ? db.query.systemSettings.findFirst({ where: eq(systemSettings.settingKey, WORKFLOW_DEFINITIONS_KEY) }) : Promise.resolve(undefined),
    ]);
    try { customNavigation = sanitizeCustomMenu(setting?.settingValue ? JSON.parse(setting.settingValue) : []); } catch { customNavigation = []; }
    try { workflows = parseWorkflows(workflowSetting?.settingValue ? JSON.parse(workflowSetting.settingValue) : []).map(({ id, name }) => ({ id, name })); } catch { workflows = []; }
  }
  return (
    <html lang="en" className="h-full bg-gray-50">
      <body className="h-full bg-gray-50 text-slate-900 antialiased font-sans">
        <AppLayout role={user?.role ?? 'super_admin'} customNavigation={customNavigation} workflows={workflows}>{children}</AppLayout>
      </body>
    </html>
  );
}
