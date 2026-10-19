import type { ProductType, ReleaseStatus, StorageStatus } from '@/types/api';

export const PRODUCT_TYPE_LABELS: Record<ProductType, string> = {
  DESKTOP_COMPUTER: 'Desktop Computer',
  LAPTOP: 'Laptop',
  MOBILE_PHONE: 'Mobile Phone',
  TABLET: 'Tablet',
  OTHER: 'Other',
};

export const PRODUCT_TYPES: ProductType[] = [
  'DESKTOP_COMPUTER',
  'LAPTOP',
  'MOBILE_PHONE',
  'TABLET',
  'OTHER',
];

/** Product types that must carry a serial number. */
export const SERIAL_REQUIRED_PRODUCT_TYPES: ProductType[] = [
  'DESKTOP_COMPUTER',
  'LAPTOP',
  'MOBILE_PHONE',
  'TABLET',
];

export const STORAGE_STATUS_LABELS: Record<StorageStatus, string> = {
  PENDING: 'Pending review',
  STORED: 'In storage',
  REJECTED: 'Rejected',
  RELEASED: 'Released',
};

export const RELEASE_STATUS_LABELS: Record<ReleaseStatus, string> = {
  PENDING: 'Awaiting decision',
  APPROVED: 'Approved',
  REJECTED: 'Rejected',
};

/**
 * Formats an ISO timestamp deterministically in UTC so the server-rendered
 * and client-rendered markup match.
 */
export function formatDateTime(value: string | null | undefined): string {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '—';
  const formatted = new Intl.DateTimeFormat('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
    timeZone: 'UTC',
  }).format(date);
  return `${formatted} UTC`;
}

export function formatDate(value: string | null | undefined): string {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '—';
  return new Intl.DateTimeFormat('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    timeZone: 'UTC',
  }).format(date);
}

export function displayOrDash(value: string | null | undefined): string {
  return value && value.trim().length > 0 ? value : '—';
}

/** Short, readable form of a UUID for table columns: `3f9a1c2b…`. */
export function shortId(id: string | null | undefined): string {
  if (!id) return '—';
  return id.slice(0, 8);
}

