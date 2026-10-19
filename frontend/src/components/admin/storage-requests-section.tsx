'use client';

import { useCallback, useEffect, useState } from 'react';
import { AlertCircle, CheckCircle2, Eye, Inbox, Loader2, XCircle } from 'lucide-react';
import { toast } from 'sonner';
import { DeviceDetailsDialog } from '@/components/admin/device-details-dialog';
import { RejectDialog } from '@/components/admin/reject-dialog';
import { EmptyState } from '@/components/empty-state';
import { StorageStatusBadge } from '@/components/status-badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
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
  shortId,
} from '@/lib/format';
import type { Device, StorageStatus } from '@/types/api';

const FILTERS: Array<{ value: StorageStatus; label: string }> = [
  { value: 'PENDING', label: 'Pending review' },
  { value: 'STORED', label: 'In storage' },
  { value: 'REJECTED', label: 'Rejected' },
  { value: 'RELEASED', label: 'Released' },
];

/**
 * Section A — storage requests, with the approve / reject decisions. Approving
 * is what issues the storage token.
 */
export function StorageRequestsSection() {
  const [status, setStatus] = useState<StorageStatus>('PENDING');
  const [devices, setDevices] = useState<Device[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [details, setDetails] = useState<Device | null>(null);
  const [rejectTarget, setRejectTarget] = useState<Device | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setDevices(await api.admin.storageRequests(status));
    } catch (caught) {
      setError(
        caught instanceof ApiError
          ? caught.message
          : 'Could not load storage requests.',
      );
    } finally {
      setLoading(false);
    }
  }, [status]);

  useEffect(() => {
    void load();
  }, [load]);

  async function approve(device: Device) {
    setBusyId(device.id);
    try {
      const updated = await api.admin.approveStorage(device.id);
      toast.success(
        `Storage approved. Token ${updated.storageToken ?? ''} issued.`,
      );
      await load();
    } catch (caught) {
      toast.error(
        caught instanceof ApiError ? caught.message : 'Approval failed.',
      );
      await load();
    } finally {
      setBusyId(null);
    }
  }

  async function reject(device: Device, reason: string) {
    setBusyId(device.id);
    try {
      await api.admin.rejectStorage(device.id, reason);
      toast.success('Storage request rejected.');
      setRejectTarget(null);
      await load();
    } catch (caught) {
      toast.error(
        caught instanceof ApiError ? caught.message : 'Rejection failed.',
      );
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-sm text-muted-foreground">Filter by status</span>
        <Select
          value={status}
          onValueChange={(value) => setStatus(value as StorageStatus)}
        >
          <SelectTrigger className="w-[190px]" aria-label="Filter by status">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {FILTERS.map((filter) => (
              <SelectItem key={filter.value} value={filter.value}>
                {filter.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

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
          icon={Inbox}
          title="Nothing to review here"
          description={
            status === 'PENDING'
              ? 'There are no storage requests waiting for a decision.'
              : 'No devices with this storage status.'
          }
        />
      ) : (
        <div className="rounded-lg border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Request</TableHead>
                <TableHead>Owner</TableHead>
                <TableHead>University ID</TableHead>
                <TableHead>Device</TableHead>
                <TableHead>Serial</TableHead>
                <TableHead>Submitted</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {devices.map((device) => (
                <TableRow key={device.id}>
                  <TableCell className="font-mono text-xs" title={device.id}>
                    #{shortId(device.id)}
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
                      {device.productName}
                    </span>
                  </TableCell>
                  <TableCell className="font-mono text-xs">
                    {displayOrDash(device.serialNumber)}
                  </TableCell>
                  <TableCell className="whitespace-nowrap text-xs">
                    {formatDateTime(device.storageSubmittedAt)}
                  </TableCell>
                  <TableCell>
                    <StorageStatusBadge status={device.storageStatus} />
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-wrap justify-end gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setDetails(device)}
                      >
                        <Eye className="h-3.5 w-3.5" aria-hidden />
                        Details
                      </Button>

                      {device.storageStatus === 'PENDING' ? (
                        <>
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button size="sm" disabled={busyId === device.id}>
                                <CheckCircle2 className="h-3.5 w-3.5" aria-hidden />
                                Approve storage
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>
                                  Approve storage for this device?
                                </AlertDialogTitle>
                                <AlertDialogDescription>
                                  {device.productName} will be marked as in
                                  storage and a unique storage token will be
                                  issued to {device.owner?.fullName ?? 'the owner'}.
                                  Only approve after the device has been
                                  received at the counter.
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Cancel</AlertDialogCancel>
                                <AlertDialogAction
                                  onClick={() => void approve(device)}
                                >
                                  {busyId === device.id ? (
                                    <Loader2
                                      className="h-4 w-4 animate-spin"
                                      aria-hidden
                                    />
                                  ) : null}
                                  Approve storage
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                          <Button
                            variant="destructive"
                            size="sm"
                            onClick={() => setRejectTarget(device)}
                            disabled={busyId === device.id}
                          >
                            <XCircle className="h-3.5 w-3.5" aria-hidden />
                            Reject
                          </Button>
                        </>
                      ) : (
                        <span className="text-xs text-muted-foreground">
                          Decided
                        </span>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      <DeviceDetailsDialog
        device={details}
        open={details !== null}
        onOpenChange={(open) => {
          if (!open) setDetails(null);
        }}
      />

      <RejectDialog
        open={rejectTarget !== null}
        onOpenChange={(open) => {
          if (!open) setRejectTarget(null);
        }}
        title="Reject this storage request?"
        description={
          rejectTarget
            ? `The owner (${rejectTarget.owner?.fullName ?? 'this user'}) will see your reason on their dashboard. No storage token is issued.`
            : ''
        }
        confirmLabel="Reject storage"
        pending={busyId === rejectTarget?.id}
        onConfirm={async (reason) => {
          if (rejectTarget) await reject(rejectTarget, reason);
        }}
      />
    </div>
  );
}
