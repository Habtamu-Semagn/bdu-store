'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { ChevronLeft, ChevronRight, X } from 'lucide-react';
import {
  ADMIN_SECTIONS,
  ADMIN_SECTION_ORDER,
  isAdminSectionActive,
} from '@/components/admin/admin-sections';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface AdminSidebarProps {
  /** Desktop rail mode: icons only. Ignored by the drawer variant. */
  collapsed?: boolean;
  onToggleCollapse?: () => void;
  variant?: 'static' | 'drawer';
  onClose?: () => void;
  onNavigate?: () => void;
  className?: string;
}

/**
 * Section navigation for the administrator console. Renders as a persistent
 * column on large screens (collapsible to an icon rail) and inside a
 * slide-over drawer on small screens.
 */
export function AdminSidebar({
  collapsed = false,
  onToggleCollapse,
  variant = 'static',
  onClose,
  onNavigate,
  className,
}: AdminSidebarProps) {
  const pathname = usePathname();
  const isDrawer = variant === 'drawer';
  const isCollapsed = collapsed && !isDrawer;

  return (
    <nav
      aria-label="Store administration sections"
      className={cn(
        'flex flex-col border-r border-border/70 bg-white',
        isCollapsed ? 'w-[68px]' : 'w-64',
        className,
      )}
    >
      <div
        className={cn(
          'flex h-14 shrink-0 items-center border-b border-border/70',
          isCollapsed ? 'justify-center px-2' : 'justify-between px-4',
        )}
      >
        {isCollapsed ? null : (
          <span className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
            Sections
          </span>
        )}

        {isDrawer && onClose ? (
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            onClick={onClose}
            aria-label="Close section navigation"
          >
            <X className="h-4 w-4" aria-hidden />
          </Button>
        ) : null}

        {!isDrawer && onToggleCollapse ? (
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            onClick={onToggleCollapse}
            aria-label={isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            aria-expanded={!isCollapsed}
            title={isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          >
            {isCollapsed ? (
              <ChevronRight className="h-4 w-4" aria-hidden />
            ) : (
              <ChevronLeft className="h-4 w-4" aria-hidden />
            )}
          </Button>
        ) : null}
      </div>

      <ul className="flex flex-1 flex-col gap-1 overflow-y-auto p-2">
        {ADMIN_SECTION_ORDER.map((key) => {
          const section = ADMIN_SECTIONS[key];
          const active = isAdminSectionActive(pathname, section.href);

          return (
            <li key={section.href}>
              <Link
                href={section.href}
                onClick={onNavigate}
                aria-current={active ? 'page' : undefined}
                title={isCollapsed ? section.label : undefined}
                className={cn(
                  'flex items-center rounded-md text-sm transition-colors',
                  isCollapsed ? 'justify-center px-0 py-2.5' : 'gap-3 px-3 py-2.5',
                  active
                    ? 'bg-primary/10 font-medium text-primary'
                    : 'text-muted-foreground hover:bg-secondary hover:text-foreground',
                )}
              >
                <section.icon className="h-4 w-4 shrink-0" aria-hidden />
                {isCollapsed ? null : (
                  <span className="truncate">{section.label}</span>
                )}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
