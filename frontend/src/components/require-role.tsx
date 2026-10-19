'use client';

import { useEffect, type ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2 } from 'lucide-react';
import { useAuth } from '@/context/auth-context';
import type { Role } from '@/types/api';

export function FullPageSpinner({ label = 'Loading…' }: { label?: string }) {
  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center gap-3 text-muted-foreground">
      <Loader2 className="h-6 w-6 animate-spin" aria-hidden />
      <p className="text-sm">{label}</p>
    </div>
  );
}

/**
 * Client-side route protection. The API enforces every rule on the server;
 * this only decides what the user is allowed to see and where to send them.
 */
export function RequireRole({
  role,
  children,
}: {
  role: Role;
  children: ReactNode;
}) {
  const { user, status } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.replace('/login');
      return;
    }
    if (status === 'authenticated' && user && user.role !== role) {
      router.replace(user.role === 'ADMIN' ? '/admin' : '/dashboard');
    }
  }, [status, user, role, router]);

  if (status === 'loading') {
    return <FullPageSpinner label="Checking your session…" />;
  }
  if (!user || user.role !== role) {
    return <FullPageSpinner label="Redirecting…" />;
  }
  return <>{children}</>;
}
