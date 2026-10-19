import { ClipboardList, LayoutDashboard, PackageSearch, Undo2, type LucideIcon } from 'lucide-react';

export interface AdminSection {
  href: string;
  label: string;
  description: string;
  icon: LucideIcon;
}

/**
 * The three administrator sections, keyed so each page renders its own heading
 * from the same source of truth as the sidebar.
 *
 * Deliberately NOT a `'use client'` module: the section pages are server
 * components, and importing a plain object out of a client module would hand
 * them an undefined client reference at build time.
 */
export const ADMIN_SECTIONS: Record<
  'overview' | 'storage' | 'devices' | 'releases',
  AdminSection
> = {
  overview: {
    href: '/admin',
    label: 'Overview',
    description:
      'How many devices the store is holding, what is waiting for a decision, and the breakdown by category.',
    icon: LayoutDashboard,
  },
  storage: {
    href: '/admin/requests',
    label: 'Storage requests',
    description:
      'Approve a request only after the device has been handed over at the counter. Approval issues the storage token.',
    icon: ClipboardList,
  },
  devices: {
    href: '/admin/devices',
    label: 'Stored devices',
    description:
      'Devices the store is currently holding. The token identifies a device at the counter; it is not enough on its own to release it.',
    icon: PackageSearch,
  },
  releases: {
    href: '/admin/releases',
    label: 'Release requests',
    description:
      'Approving a release marks the device as released. Rejecting keeps it in storage and requires a reason for the owner.',
    icon: Undo2,
  },
};

export const ADMIN_SECTION_ORDER = [
  'overview',
  'storage',
  'devices',
  'releases',
] as const;

/** `/admin` matches exactly; the others also match their sub-paths. */
export function isAdminSectionActive(pathname: string, href: string): boolean {
  return href === '/admin'
    ? pathname === '/admin'
    : pathname === href || pathname.startsWith(`${href}/`);
}
