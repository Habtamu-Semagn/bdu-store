import type { Metadata } from 'next';
import AuthShell from '@/components/auth-shell';
import RegisterForm from './register-form';

export const metadata: Metadata = { title: 'Register' };

export default function RegisterPage() {
  return (
    <AuthShell
      title="Create your BDU Store account"
      description="Campus residents register with their Bahir Dar University ID — no email address is needed."
      footer={
        <span>
          Already registered? Log in from the{' '}
          <a href="/login" className="font-medium text-primary underline-offset-4 hover:underline">
            login page
          </a>
          .
        </span>
      }
    >
      <RegisterForm />
    </AuthShell>
  );
}
