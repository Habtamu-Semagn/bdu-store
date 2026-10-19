import { Badge } from '@/components/ui/badge';
import {
  RELEASE_STATUS_LABELS,
  STORAGE_STATUS_LABELS,
} from '@/lib/format';
import type { ReleaseStatus, StorageStatus } from '@/types/api';

const STORAGE_VARIANTS: Record<
  StorageStatus,
  'warning' | 'info' | 'destructive' | 'success' | 'secondary'
> = {
  PENDING: 'warning',
  STORED: 'info',
  REJECTED: 'destructive',
  RELEASED: 'success',
};

const RELEASE_VARIANTS: Record<
  ReleaseStatus,
  'warning' | 'success' | 'destructive'
> = {
  PENDING: 'warning',
  APPROVED: 'success',
  REJECTED: 'destructive',
};

export function StorageStatusBadge({ status }: { status: StorageStatus }) {
  return (
    <Badge variant={STORAGE_VARIANTS[status] ?? 'secondary'}>
      {STORAGE_STATUS_LABELS[status] ?? status}
    </Badge>
  );
}

export function ReleaseStatusBadge({
  status,
}: {
  status: ReleaseStatus | null | undefined;
}) {
  if (!status) {
    return <span className="text-sm text-muted-foreground">No request</span>;
  }
  return (
    <Badge variant={RELEASE_VARIANTS[status] ?? 'secondary'}>
      {RELEASE_STATUS_LABELS[status] ?? status}
    </Badge>
  );
}
