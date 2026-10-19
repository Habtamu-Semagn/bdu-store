'use client';

import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { AlertCircle, CheckCircle2, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useAuth } from '@/context/auth-context';
import { ApiError } from '@/lib/api';
import { loginSchema, normalizeUniversityIdInput, type LoginFormValues } from '@/lib/validation';

export default function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { login } = useAuth();

  const [formError, setFormError] = useState<string | null>(null);
  const justRegistered = searchParams.get('registered') === '1';
  const nextPath = searchParams.get('next');

  const {
    register,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: { universityId: '', password: '' },
  });

  const onSubmit = handleSubmit(async (values) => {
    setFormError(null);
    try {
      const user = await login({
        universityId: normalizeUniversityIdInput(values.universityId),
        password: values.password,
      });
      toast.success(`Welcome back, ${user.fullName.split(' ')[0]}.`);
      const destination =
        nextPath && nextPath.startsWith('/')
          ? nextPath
          : user.role === 'ADMIN'
            ? '/admin'
            : '/dashboard';
      router.replace(destination);
    } catch (error) {
      if (error instanceof ApiError) {
        setFormError(error.message);
        for (const [field, message] of Object.entries(error.fieldErrors)) {
          if (field === 'universityId' || field === 'password') {
            setError(field, { message });
          }
        }
        return;
      }
      setFormError('Something went wrong. Please try again.');
    }
  });

  return (
    <form onSubmit={onSubmit} className="space-y-5" noValidate>
      {justRegistered ? (
        <Alert variant="success">
          <CheckCircle2 />
          <AlertDescription>
            Your account was created. Log in with your university ID to continue.
          </AlertDescription>
        </Alert>
      ) : null}

      {formError ? (
        <Alert variant="destructive">
          <AlertCircle />
          <AlertDescription>{formError}</AlertDescription>
        </Alert>
      ) : null}

      <div className="space-y-2">
        <Label htmlFor="universityId">University ID</Label>
        <Input
          id="universityId"
          inputMode="text"
          autoComplete="username"
          placeholder="bdu1504757"
          aria-invalid={Boolean(errors.universityId)}
          {...register('universityId')}
        />
        {errors.universityId ? (
          <p className="text-sm text-destructive">{errors.universityId.message}</p>
        ) : (
          <p className="text-xs text-muted-foreground">
            Bahir Dar University ID, e.g. bdu1504757.
          </p>
        )}
      </div>

      <div className="space-y-2">
        <Label htmlFor="password">Password</Label>
        <Input
          id="password"
          type="password"
          autoComplete="current-password"
          aria-invalid={Boolean(errors.password)}
          {...register('password')}
        />
        {errors.password ? (
          <p className="text-sm text-destructive">{errors.password.message}</p>
        ) : null}
      </div>

      <Button type="submit" className="w-full" disabled={isSubmitting}>
        {isSubmitting ? (
          <>
            <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
            Logging in…
          </>
        ) : (
          'Log in'
        )}
      </Button>

      <p className="text-center text-sm text-muted-foreground">
        Don&apos;t have an account?{' '}
        <Link href="/register" className="font-medium text-primary underline-offset-4 hover:underline">
          Register
        </Link>
      </p>
    </form>
  );
}
