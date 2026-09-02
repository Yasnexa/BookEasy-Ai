'use client';

import { useAuth } from '@/lib/auth-context';
import { useRouter } from 'next/navigation';
import { ReactNode, useEffect, useState } from 'react';
import { AppShell } from '@/components/app-shell';

export default function DashboardLayout({ children }: { children: ReactNode }) {
  const { user, loading, hasSession } = useAuth();
  const router = useRouter();
  const [timedOut, setTimedOut] = useState(false);

  useEffect(() => {
    console.log('[dashboard-layout] guard:', { loading, hasSession, hasUser: !!user, timedOut });
    if (!loading && !hasSession) {
      console.log('[dashboard-layout] no session, redirecting to /login');
      router.replace('/login');
    }
  }, [loading, hasSession, user, router, timedOut]);

  useEffect(() => {
    const t = setTimeout(() => {
      if (!user) {
        console.warn('[dashboard-layout] timeout reached with no user, forcing redirect to /login');
        setTimedOut(true);
        router.replace('/login');
      }
    }, 8000);
    return () => clearTimeout(t);
  }, [user, router]);

  if (loading || !user) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-muted/20">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      </div>
    );
  }

  return <AppShell>{children}</AppShell>;
}
