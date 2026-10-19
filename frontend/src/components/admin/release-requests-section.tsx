'use client';

import { useCallback, useEffect, useState } from 'react';
import { AlertCircle, CheckCircle2, Inbox, Loader2, XCircle } from 'lucide-react';
import { toast } from 'sonner';
import { RejectDialog } from '@/components/admin/reject-dialog';
import { EmptyState } from '@/components/empty-state';
import { ReleaseStatusBadge } from '@/components/status-badge';
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
} from '@/lib/format';
import type { AdminReleaseRequest, ReleaseStatus } from '@/types/api';

const FILTERS: Array<{ value: ReleaseStatus; label: string }> = [
  { value: 'PENDING', label: 'Awaiting decision' },
  { value: 'APPROVED', label: 'Approved' },
  { value: 'REJECTED', label: 'Rejected' },
];

/**
 * Section C — release requests. Approving moves the device to RELEASED;
 * rejecting leaves it in storage so the owner can ask again later.
 */
export function ReleaseRequestsSection() {
  const [status, setStatus] = useState<ReleaseStatus>('PENDING');
  const [requests, setRequests] = useState<AdminReleaseRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [rejectTarget, setRejectTarget] = useState<AdminReleaseRequest | null>(
    null,
  );

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setRequests(await api.admin.releaseRequests(status));
    } catch (caught) {
      setError(
        caught instanceof ApiError
          ? caught.message
          : 'Could not load release requests.',
      );
    } finally {
      setLoading(false);
    }
  }, [status]);

  useEffect(() => {
    void load();
  }, [load]);

  async function approve(request: AdminReleaseRequest) {
    setBusyId(request.id);
    try {
      await api.admin.approveRelease(request.id);
      toast.success('Release approved. The device is now marked as released.');
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

  async function reject(request: AdminReleaseRequest, reason: string) {
    setBusyId(request.id);
    try {
      await api.admin.rejectRelease(request.id, reason);
      toast.success('Release request rejected. The device stays in storage.');
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
          onValueChange={(value) => setStatus(value as ReleaseStatus)}
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
      ) : requests.length === 0 ? (
        <EmptyState
          icon={Inbox}
          title="No release requests"
          description={
            status === 'PENDING'
              ? 'No owner is waiting for a release decision right now.'
              : 'No release requests with this status.'
          }
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
                <TableHead>Requested</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {requests.map((request) => (
                <TableRow key={request.id}>
                  <TableCell className="font-mono text-xs break-all">
                    {displayOrDash(request.device.storageToken)}
                  </TableCell>
                  <TableCell className="font-medium">
                    {request.owner.fullName}
                  </TableCell>
                  <TableCell>{request.owner.universityId}</TableCell>
                  <TableCell>
                    <span className="block">
                      {PRODUCT_TYPE_LABELS[request.device.productType] ??
                        request.device.productType}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      {[
                        request.device.productName,
                        request.device.brand,
                        request.device.model,
                      ]
                        .filter(Boolean)
                        .join(' · ')}
                    </span>
                  </TableCell>
                  <TableCell className="whitespace-nowrap text-xs">
                    {formatDateTime(request.requestedAt)}
                  </TableCell>
                  <TableCell>
                    <ReleaseStatusBadge status={request.status} />
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-wrap justify-end gap-2">
                      {request.status === 'PENDING' ? (
                        <>
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button size="sm" disabled={busyId === request.id}>
                                <CheckCircle2 className="h-3.5 w-3.5" aria-hidden />
                                Approve release
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>
                                  Approve this release?
                                </AlertDialogTitle>
                                <AlertDialogDescription>
                                  {request.device.productName} (token{' '}
                                  {request.device.storageToken}) will be marked
                                  as released and can no longer be requested
                                  again. Confirm the physical handover at the
                                  counter.
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Cancel</AlertDialogCancel>
                                <AlertDialogAction
                                  onClick={() => void approve(request)}
                                >
                                  {busyId === request.id ? (
                                    <Loader2
                                      className="h-4 w-4 animate-spin"
                                      aria-hidden
                                    />
                                  ) : null}
                                  Approve release
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>

                          <Button
                            variant="destructive"
                            size="sm"
                            onClick={() => setRejectTarget(request)}
                            disabled={busyId === request.id}
                          >
                            <XCircle className="h-3.5 w-3.5" aria-hidden />
                            Reject
                          </Button>
                        </>
                      ) : (
                        <span className="text-xs text-muted-foreground">
                          Decided {formatDateTime(request.reviewedAt)}
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

      <RejectDialog
        open={rejectTarget !== null}
        onOpenChange={(open) => {
          if (!open) setRejectTarget(null);
        }}
        title="Reject this release request?"
        description={
          rejectTarget
            ? `${rejectTarget.owner.fullName} will see your reason. The device stays in storage and they can request release again later.`
            : ''
        }
        confirmLabel="Reject release"
        pending={busyId === rejectTarget?.id}
        onConfirm={async (reason) => {
          if (rejectTarget) await reject(rejectTarget, reason);
        }}
      />
    </div>
  );
}
