import SiteFooter from '@/components/site-footer';
import { AppHeader } from '@/components/app-header';
import { RequireRole } from '@/components/require-role';

const NAV_ITEMS = [
  { href: '/dashboard', label: 'My devices' },
  { href: '/devices/register', label: 'Register device' },
];

/** Layout for signed-in campus users. */
export default function UserLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <RequireRole role="USER">
      <div className="flex min-h-screen flex-col">
        <AppHeader items={NAV_ITEMS} roleLabel="Campus user" />
        <main className="container flex-1 py-8">{children}</main>
        <SiteFooter />
      </div>
    </RequireRole>
  );
}
