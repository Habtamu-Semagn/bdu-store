'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useState } from 'react';
import { LogOut, Loader2, Menu } from 'lucide-react';
import { toast } from 'sonner';
import { BrandMark } from '@/components/brand-mark';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/context/auth-context';
import { cn } from '@/lib/utils';

export interface NavItem {
  href: string;
  label: string;
}

/**
 * Shared application header. Shows the signed-in user's name and university ID
 * (never an email), the role, and — when `items` is provided — inline section
 * navigation.
 *
 * @param onMenuClick When given, a menu button is shown below `lg` that opens
 *   the caller's own navigation (the administrator console uses a sidebar).
 * @param fullWidth Use the full viewport width instead of the centred
 *   container, so the header lines up with a flush-left sidebar.
 */
export function AppHeader({
  items = [],
  roleLabel,
  onMenuClick,
  fullWidth = false,
}: {
  items?: NavItem[];
  roleLabel: string;
  onMenuClick?: () => void;
  fullWidth?: boolean;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const { user, logout } = useAuth();
  const [signingOut, setSigningOut] = useState(false);

  async function handleLogout() {
    setSigningOut(true);
    try {
      await logout();
      toast.success('You have been logged out.');
      router.replace('/login');
    } finally {
      setSigningOut(false);
    }
  }

  return (
    <header className="sticky top-0 z-40 border-b border-border/70 bg-white/95 backdrop-blur">
      <div
        className={cn(
          'flex h-16 items-center justify-between gap-4',
          fullWidth ? 'w-full px-4 sm:px-6' : 'container',
        )}
      >
        <div className="flex min-w-0 items-center gap-3">
          {onMenuClick ? (
            <Button
              variant="ghost"
              size="icon"
              className="-ml-2 lg:hidden"
              onClick={onMenuClick}
              aria-label="Open section navigation"
            >
              <Menu className="h-5 w-5" aria-hidden />
            </Button>
          ) : null}

          <BrandMark href={user?.role === 'ADMIN' ? '/admin' : '/dashboard'} />

          {items.length > 0 ? (
            <nav className="hidden items-center gap-1 md:flex">
              {items.map((item) => {
                const active =
                  pathname === item.href || pathname.startsWith(`${item.href}/`);
                return (
                  <Button
                    key={item.href}
                    asChild
                    variant="ghost"
                    size="sm"
                    className={cn(active && 'bg-secondary text-secondary-foreground')}
                  >
                    <Link href={item.href}>{item.label}</Link>
                  </Button>
                );
              })}
            </nav>
          ) : null}
        </div>

        <div className="flex shrink-0 items-center gap-3">
          <div className="hidden text-right sm:block">
            <p className="text-sm font-medium leading-tight">{user?.fullName}</p>
            <p className="text-xs text-muted-foreground">
              {user ? user.universityId : ''}
            </p>
          </div>
          <Badge variant="secondary" className="hidden sm:inline-flex">
            {roleLabel}
          </Badge>
          <Button
            variant="outline"
            size="sm"
            onClick={handleLogout}
            disabled={signingOut}
          >
            {signingOut ? (
              <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
            ) : (
              <LogOut className="h-4 w-4" aria-hidden />
            )}
            <span className="hidden sm:inline">Log out</span>
          </Button>
        </div>
      </div>

      {items.length > 0 ? (
        <nav className="flex items-center gap-1 overflow-x-auto border-t border-border/70 px-4 py-2 md:hidden">
          {items.map((item) => {
            const active =
              pathname === item.href || pathname.startsWith(`${item.href}/`);
            return (
              <Button
                key={item.href}
                asChild
                variant="ghost"
                size="sm"
                className={cn(active && 'bg-secondary text-secondary-foreground')}
              >
                <Link href={item.href}>{item.label}</Link>
              </Button>
            );
          })}
        </nav>
      ) : null}
    </header>
  );
}
