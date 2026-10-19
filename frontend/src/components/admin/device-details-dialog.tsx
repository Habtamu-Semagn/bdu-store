'use client';

import { ReleaseStatusBadge, StorageStatusBadge } from '@/components/status-badge';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Separator } from '@/components/ui/separator';
import {
  PRODUCT_TYPE_LABELS,
  displayOrDash,
  formatDateTime,
  shortId,
} from '@/lib/format';
import type { Device } from '@/types/api';

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="grid grid-cols-3 gap-3 py-2">
      <dt className="text-sm text-muted-foreground">{label}</dt>
      <dd className="col-span-2 text-sm break-words">{value}</dd>
    </div>
  );
}

/** Full record for one device, shown to administrators before a decision. */
export function DeviceDetailsDialog({
  device,
  open,
  onOpenChange,
}: {
  device: Device | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  if (!device) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>{device.productName}</DialogTitle>
          <DialogDescription>
            Storage request #{shortId(device.id)} ·{' '}
            {PRODUCT_TYPE_LABELS[device.productType] ?? device.productType}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <section>
            <h3 className="text-sm font-semibold">Owner</h3>
            <Separator className="my-2" />
            <dl className="divide-y">
              <Row label="Full name" value={device.owner?.fullName ?? '—'} />
              <Row
                label="University ID"
                value={device.owner?.universityId ?? '—'}
              />
            </dl>
          </section>

          <section>
            <h3 className="text-sm font-semibold">Device</h3>
            <Separator className="my-2" />
            <dl className="divide-y">
              <Row
                label="Product type"
                value={PRODUCT_TYPE_LABELS[device.productType] ?? device.productType}
              />
              <Row label="Product name" value={device.productName} />
              <Row label="Brand" value={displayOrDash(device.brand)} />
              <Row label="Model" value={displayOrDash(device.model)} />
              <Row
                label="Serial number"
                value={
                  device.serialNumber ? (
                    <span className="font-mono">{device.serialNumber}</span>
                  ) : (
                    '—'
                  )
                }
              />
              <Row
                label="Description"
                value={displayOrDash(device.description)}
              />
            </dl>
          </section>

          <section>
            <h3 className="text-sm font-semibold">Storage</h3>
            <Separator className="my-2" />
            <dl className="divide-y">
              <Row
                label="Status"
                value={<StorageStatusBadge status={device.storageStatus} />}
              />
              <Row
                label="Storage token"
                value={
                  device.storageToken ? (
                    <span className="font-mono break-all">
                      {device.storageToken}
                    </span>
                  ) : (
                    'Not issued yet'
                  )
                }
              />
              <Row
                label="Submitted"
                value={formatDateTime(device.storageSubmittedAt)}
              />
              <Row
                label="Approved"
                value={formatDateTime(device.storageApprovedAt)}
              />
              <Row
                label="Rejected"
                value={
                  device.storageRejectedAt
                    ? `${formatDateTime(device.storageRejectedAt)}`
                    : '—'
                }
              />
              <Row
                label="Rejection reason"
                value={displayOrDash(device.storageRejectionReason)}
              />
            </dl>
          </section>

          <section>
            <h3 className="text-sm font-semibold">Release</h3>
            <Separator className="my-2" />
            <dl className="divide-y">
              <Row
                label="Request status"
                value={<ReleaseStatusBadge status={device.releaseRequest?.status} />}
              />
              <Row
                label="Requested"
                value={formatDateTime(device.releaseRequest?.requestedAt)}
              />
              <Row
                label="Reviewed"
                value={formatDateTime(device.releaseRequest?.reviewedAt)}
              />
              <Row
                label="Rejection reason"
                value={displayOrDash(device.releaseRequest?.rejectionReason)}
              />
            </dl>
          </section>
        </div>
      </DialogContent>
    </Dialog>
  );
}
