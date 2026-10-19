'use client';

import { useState } from 'react';
import { Copy, KeyRound, Loader2, PackageCheck, Undo2 } from 'lucide-react';
import { toast } from 'sonner';
import { StorageStatusBadge, ReleaseStatusBadge } from '@/components/status-badge';
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
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { ApiError, api } from '@/lib/api';
import {
  PRODUCT_TYPE_LABELS,
  displayOrDash,
  formatDateTime,
} from '@/lib/format';
import type { Device } from '@/types/api';

function Field({
  label,
  value,
  mono = false,
}: {
  label: string;
  value: string;
  mono?: boolean;
}) {
  return (
    <div className="space-y-1">
      <dt className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
        {label}
      </dt>
      <dd className={mono ? 'font-mono text-sm break-all' : 'text-sm'}>{value}</dd>
    </div>
  );
}

export function DeviceCard({
  device,
  onChanged,
}: {
  device: Device;
  onChanged: () => void | Promise<void>;
}) {
  const [requesting, setRequesting] = useState(false);

  async function requestRelease() {
    setRequesting(true);
    try {
      await api.devices.requestRelease(device.id);
      toast.success('Release request submitted. The store will review it.');
      await onChanged();
    } catch (error) {
      toast.error(
        error instanceof ApiError
          ? error.message
          : 'Could not submit the release request.',
      );
    } finally {
      setRequesting(false);
    }
  }

  async function copyToken() {
    if (!device.storageToken) return;
    try {
      await navigator.clipboard.writeText(device.storageToken);
      toast.success('Storage token copied.');
    } catch {
      toast.error('Could not copy the token.');
    }
  }

  return (
    <Card>
      <CardHeader className="gap-3 pb-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="space-y-1">
            <h3 className="font-semibold leading-tight">{device.productName}</h3>
            <p className="text-sm text-muted-foreground">
              {PRODUCT_TYPE_LABELS[device.productType] ?? device.productType}
              {device.brand || device.model
                ? ` · ${[device.brand, device.model].filter(Boolean).join(' ')}`
                : ''}
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <StorageStatusBadge status={device.storageStatus} />
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        <dl className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <Field
            label="Serial number"
            value={displayOrDash(device.serialNumber)}
          />
          <Field label="Submitted" value={formatDateTime(device.storageSubmittedAt)} />
          <Field
            label="Release request"
            value={
              device.releaseRequest
                ? `${device.releaseRequest.status} · ${formatDateTime(device.releaseRequest.requestedAt)}`
                : 'No request'
            }
          />
        </dl>

        <div className="rounded-md border bg-secondary/40 p-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <KeyRound className="h-4 w-4 text-primary" aria-hidden />
              <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                Storage token
              </span>
            </div>
            {device.storageToken ? (
              <Button variant="ghost" size="sm" onClick={copyToken}>
                <Copy className="h-3.5 w-3.5" aria-hidden />
                Copy
              </Button>
            ) : null}
          </div>
          <p className="mt-1 font-mono text-sm break-all">
            {device.storageToken ?? (
              <span className="font-sans text-muted-foreground">
                The storage token is issued once the administrator approves this
                device.
              </span>
            )}
          </p>
        </div>

        {device.storageStatus === 'REJECTED' && device.storageRejectionReason ? (
          <Alert variant="destructive">
            <AlertTitle>Storage request rejected</AlertTitle>
            <AlertDescription>{device.storageRejectionReason}</AlertDescription>
          </Alert>
        ) : null}

        {device.releaseRequest?.status === 'REJECTED' &&
        device.releaseRequest.rejectionReason ? (
          <Alert variant="warning">
            <AlertTitle>Release request rejected</AlertTitle>
            <AlertDescription>
              {device.releaseRequest.rejectionReason}
            </AlertDescription>
          </Alert>
        ) : null}

        {device.releaseRequest?.status === 'PENDING' ? (
          <Alert variant="info">
            <Loader2 className="animate-spin" />
            <AlertTitle>Release request awaiting review</AlertTitle>
            <AlertDescription>
              Submitted {formatDateTime(device.releaseRequest.requestedAt)}. The
              store will approve or reject it.
            </AlertDescription>
          </Alert>
        ) : null}

        {device.storageStatus === 'RELEASED' ? (
          <Alert variant="success">
            <PackageCheck />
            <AlertTitle>Released</AlertTitle>
            <AlertDescription>
              The store has approved the release. Collect the device at the
              counter if you have not already done so.
            </AlertDescription>
          </Alert>
        ) : null}

        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="text-xs text-muted-foreground">
            {device.storageStatus === 'PENDING'
              ? 'Waiting for the store to receive and approve this device.'
              : device.storageStatus === 'STORED'
                ? 'Held at the campus store.'
                : device.storageStatus === 'REJECTED'
                  ? 'This request was rejected. Submit a new one if you still need storage.'
                  : 'This device has been released from storage.'}
          </p>

          {device.canRequestRelease ? (
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button size="sm" disabled={requesting}>
                  <Undo2 className="h-4 w-4" aria-hidden />
                  Request release
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Request release of this device?</AlertDialogTitle>
                  <AlertDialogDescription>
                    The store will review your request. Your device stays in
                    storage until an administrator approves the release.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction onClick={requestRelease} disabled={requesting}>
                    {requesting ? (
                      <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
                    ) : null}
                    Submit request
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          ) : (
            <ReleaseStatusBadge status={device.releaseRequest?.status} />
          )}
        </div>
      </CardContent>
    </Card>
  );
}
