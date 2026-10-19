'use client';

import { useCallback, useEffect, useState } from 'react';
import { AlertCircle, PackageSearch } from 'lucide-react';
import { EmptyState } from '@/components/empty-state';
import { ReleaseStatusBadge } from '@/components/status-badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { ApiError, api } from '@/lib/api';
import {
  PRODUCT_TYPE_LABELS,
  displayOrDash,
  formatDateTime,
} from '@/lib/format';
import type { Device } from '@/types/api';

/** Section B — everything currently held in the store, with its token. */
export function StoredDevicesSection() {
  const [devices, setDevices] = useState<Device[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setDevices(await api.admin.storedDevices());
    } catch (caught) {
      setError(
        caught instanceof ApiError
          ? caught.message
          : 'Could not load stored devices.',
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  return (
    <div className="space-y-4">
      {error ? (
        <Alert variant="destructive">
          <AlertCircle />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      ) : null}

      {loading ? (
        <Skeleton className="h-64 w-full" />
      ) : devices.length === 0 ? (
        <EmptyState
          icon={PackageSearch}
          title="Nothing in storage"
          description="Approved devices will appear here together with their storage tokens."
        />
      ) : (
        <div className="rounded-lg border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Storage token</TableHead>
                <TableHead>Owner</TableHead>
                <TableHead>University ID</TableHead>
                <TableHead>Device</TableHead>
                <TableHead>Serial</TableHead>
                <TableHead>Approved</TableHead>
                <TableHead>Release request</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {devices.map((device) => (
                <TableRow key={device.id}>
                  <TableCell className="font-mono text-xs break-all">
                    {displayOrDash(device.storageToken)}
                  </TableCell>
                  <TableCell className="font-medium">
                    {device.owner?.fullName ?? '—'}
                  </TableCell>
                  <TableCell>{device.owner?.universityId ?? '—'}</TableCell>
                  <TableCell>
                    <span className="block">
                      {PRODUCT_TYPE_LABELS[device.productType] ?? device.productType}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      {[device.productName, device.brand, device.model]
                        .filter(Boolean)
                        .join(' · ')}
                    </span>
                  </TableCell>
                  <TableCell className="font-mono text-xs">
                    {displayOrDash(device.serialNumber)}
                  </TableCell>
                  <TableCell className="whitespace-nowrap text-xs">
                    {formatDateTime(device.storageApprovedAt)}
                  </TableCell>
                  <TableCell>
                    <ReleaseStatusBadge status={device.releaseRequest?.status} />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}
