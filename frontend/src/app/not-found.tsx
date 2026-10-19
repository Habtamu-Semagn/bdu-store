import Link from 'next/link';
import { Button } from '@/components/ui/button';
import SiteFooter from '@/components/site-footer';
import { BrandMark } from '@/components/brand-mark';

export default function NotFound() {
  return (
    <div className="flex min-h-screen flex-col">
      <header className="border-b">
        <div className="container flex h-16 items-center">
          <BrandMark />
        </div>
      </header>
      <main className="container flex flex-1 flex-col items-center justify-center gap-4 py-20 text-center">
        <p className="text-sm font-medium text-primary">404</p>
        <h1 className="text-2xl font-semibold">Page not found</h1>
        <p className="max-w-md text-sm text-muted-foreground">
          The page you were looking for does not exist. Check the address, or
          head back to the BDU Store home page.
        </p>
        <Button asChild>
          <Link href="/">Back to home</Link>
        </Button>
      </main>
      <SiteFooter />
    </div>
  );
}
