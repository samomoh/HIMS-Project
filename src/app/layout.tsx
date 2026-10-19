import type { Metadata } from "next";
import type { ReactNode } from "react";
import { headers } from 'next/headers';
import { redirect } from 'next/navigation';
import "./globals.css";
import { AppLayout } from "@/components/layout/AppLayout";
import { currentUser } from '@/lib/auth';

export const metadata: Metadata = {
  title: "HealthAI HMIS",
  description: "AI-Powered Hospital Management Information System",
};

export default async function RootLayout({ children }: { children: ReactNode }) {
  const path = (await headers()).get('x-hmis-path') ?? '/';
  const isPublicPage = path.startsWith('/auth/') || path === '/unauthorized';
  const user = isPublicPage ? null : await currentUser();
  if (!isPublicPage && !user) redirect('/auth/login');
  return (
    <html lang="en" className="h-full bg-gray-50">
      <body className="h-full bg-gray-50 text-slate-900 antialiased font-sans">
        <AppLayout role={user?.role ?? 'super_admin'}>{children}</AppLayout>
      </body>
    </html>
  );
}
