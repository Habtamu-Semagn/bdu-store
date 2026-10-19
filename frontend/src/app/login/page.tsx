import type { Metadata } from 'next';
import { Suspense } from 'react';
import AuthShell from '@/components/auth-shell';
import { FullPageSpinner } from '@/components/require-role';
import LoginForm from './login-form';

export const metadata: Metadata = { title: 'Log in' };

export default function LoginPage() {
  return (
    <AuthShell
      title="Log in to BDU Store"
      description="Use the university ID you registered with."
    >
      <Suspense fallback={<FullPageSpinner label="Loading form…" />}>
        <LoginForm />
      </Suspense>
    </AuthShell>
  );
}
