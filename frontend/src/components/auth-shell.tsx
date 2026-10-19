import Link from 'next/link';
import { BrandMark } from '@/components/brand-mark';
import SiteFooter from '@/components/site-footer';

/**
 * Shared shell for the login and registration pages: centred card, BDU Store
 * branding, and a footer.
 */
export default function AuthShell({
  title,
  description,
  children,
  footer,
}: {
  title: string;
  description: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
}) {
  return (
    <div className="flex min-h-screen flex-col">
      <header className="border-b">
        <div className="container flex h-16 items-center">
          <BrandMark />
        </div>
      </header>

      <main className="container flex flex-1 items-center justify-center py-10">
        <div className="w-full max-w-md">
          <div className="mb-6 space-y-1 text-center">
            <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>
            <p className="text-sm text-muted-foreground">{description}</p>
          </div>

          <div className="rounded-lg border bg-card p-6 shadow-sm">
            {children}
          </div>

          {footer ? (
            <div className="mt-6 text-center text-sm text-muted-foreground">
              {footer}
            </div>
          ) : null}

          <p className="mt-6 text-center text-sm text-muted-foreground">
            <Link href="/" className="underline underline-offset-4">
              Back to home
            </Link>
          </p>
        </div>
      </main>

      <SiteFooter />
    </div>
  );
}
