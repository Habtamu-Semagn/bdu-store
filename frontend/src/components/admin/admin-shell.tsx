'use client';

import { useCallback, useEffect, useState } from 'react';
import { usePathname } from 'next/navigation';
import { AppHeader } from '@/components/app-header';
import { AdminSidebar } from '@/components/admin/admin-sidebar';
import SiteFooter from '@/components/site-footer';

const COLLAPSE_STORAGE_KEY = 'bdu-store:admin-sidebar-collapsed';

/**
 * Administrator console shell: header, collapsible section sidebar, content.
 *
 * - `lg` and up: a persistent column that collapses to an icon rail; the
 *   choice is remembered in localStorage.
 * - below `lg`: the sidebar becomes a slide-over drawer opened from the header
 *   menu button, closed by the backdrop, the close button, Escape, or any
 *   navigation.
 */
export function AdminShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);

  // Restore the remembered desktop preference after mount, so the
  // server-rendered markup and the first client render agree.
  useEffect(() => {
    try {
      setCollapsed(window.localStorage.getItem(COLLAPSE_STORAGE_KEY) === '1');
    } catch {
      /* storage unavailable — keep the default */
    }
  }, []);

  // Always close the drawer once navigation happens.
  useEffect(() => {
    setDrawerOpen(false);
  }, [pathname]);

  useEffect(() => {
    if (!drawerOpen) return;
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') setDrawerOpen(false);
    }
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [drawerOpen]);

  const toggleCollapsed = useCallback(() => {
    setCollapsed((previous) => {
      const next = !previous;
      try {
        window.localStorage.setItem(COLLAPSE_STORAGE_KEY, next ? '1' : '0');
      } catch {
        /* storage unavailable — the toggle still works for this session */
      }
      return next;
    });
  }, []);

  return (
    <div className="flex min-h-screen flex-col bg-white">
      <AppHeader
        roleLabel="Administrator"
        fullWidth
        onMenuClick={() => setDrawerOpen(true)}
      />

      <div className="flex flex-1">
        <AdminSidebar
          collapsed={collapsed}
          onToggleCollapse={toggleCollapsed}
          className="sticky top-16 hidden h-[calc(100vh-4rem)] shrink-0 lg:flex"
        />

        {/* Slide-over drawer for small screens. Rendered only while open, so
            its links are never focusable behind a hidden overlay. */}
        {drawerOpen ? (
          <div
            role="dialog"
            aria-modal="true"
            aria-label="Store administration sections"
            className="fixed inset-0 z-50 lg:hidden"
          >
            <button
              type="button"
              aria-label="Close section navigation"
              onClick={() => setDrawerOpen(false)}
              className="absolute inset-0 animate-in fade-in cursor-default bg-black/50"
            />
            <div className="absolute inset-y-0 left-0 animate-in slide-in-from-left duration-200">
              <AdminSidebar
                variant="drawer"
                onClose={() => setDrawerOpen(false)}
                onNavigate={() => setDrawerOpen(false)}
                className="h-full w-72 shadow-xl"
              />
            </div>
          </div>
        ) : null}

        <main className="min-w-0 flex-1 px-4 py-8 sm:px-6 lg:px-8">
          {children}
        </main>
      </div>

      <SiteFooter />
    </div>
  );
}
