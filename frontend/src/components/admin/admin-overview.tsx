'use client';

import { useCallback, useEffect, useState } from 'react';
import {
  AlertCircle,
  Boxes,
  ClipboardCheck,
  PackageCheck,
  RefreshCw,
  Undo2,
  type LucideIcon,
} from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Table,
  TableBody,
  TableCell,
  TableFooter,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { ApiError, api } from '@/lib/api';
import { PRODUCT_TYPE_LABELS, formatDateTime } from '@/lib/format';
import { cn } from '@/lib/utils';
import type {
  AdminStats,
  ProductTypeBreakdown,
  StorageStatus,
} from '@/types/api';

/** Column order and colours for the status breakdown. */
const STATUS_COLUMNS: Array<{
  key: StorageStatus;
  label: string;
  bar: string;
}> = [
  { key: 'PENDING', label: 'Awaiting', bar: 'bg-amber-400' },
  { key: 'STORED', label: 'In storage', bar: 'bg-sky-400' },
  { key: 'REJECTED', label: 'Rejected', bar: 'bg-red-400' },
  { key: 'RELEASED', label: 'Released', bar: 'bg-emerald-400' },
];

function StatTile({
  icon: Icon,
  label,
  value,
  hint,
}: {
  icon: LucideIcon;
  label: string;
  value: number;
  hint?: string;
}) {
  return (
    <div className="rounded-lg border border-border/70 bg-white p-5">
      <div className="flex items-center justify-between gap-2">
        <span className="text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
          {label}
        </span>
        <Icon className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden />
      </div>
      <p className="mt-3 text-3xl font-semibold tabular-nums tracking-tight">
        {value}
      </p>
      {hint ? (
        <p className="mt-1 text-xs text-muted-foreground">{hint}</p>
      ) : null}
    </div>
  );
}

/** Proportional bar showing how one category is split across statuses. */
function StackedBar({ row }: { row: ProductTypeBreakdown }) {
  if (row.total === 0) {
    return (
      <div
        className="mt-2 h-1.5 w-full rounded-full bg-secondary"
        aria-hidden
      />
    );
  }

  return (
    <div
      className="mt-2 flex h-1.5 w-full overflow-hidden rounded-full bg-secondary"
      role="img"
      aria-label={STATUS_COLUMNS.map(
        (column) => `${column.label}: ${row.byStorageStatus[column.key]}`,
      ).join(', ')}
    >
      {STATUS_COLUMNS.map((column) => {
        const count = row.byStorageStatus[column.key];
        if (count === 0) return null;
        return (
          <div
            key={column.key}
            className={cn('h-full', column.bar)}
            style={{ width: `${(count / row.total) * 100}%` }}
          />
        );
      })}
    </div>
  );
}

export function AdminOverview() {
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    setError(null);
    try {
      setStats(await api.admin.stats());
    } catch (caught) {
      setError(
        caught instanceof ApiError
          ? caught.message
          : 'Could not load the dashboard figures.',
      );
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {[0, 1, 2, 3].map((index) => (
            <Skeleton key={index} className="h-[116px] w-full" />
          ))}
        </div>
        <Skeleton className="h-80 w-full" />
      </div>
    );
  }

  if (error || !stats) {
    return (
      <Alert variant="destructive">
        <AlertCircle />
        <AlertDescription className="flex flex-wrap items-center gap-3">
          <span>{error ?? 'No figures available.'}</span>
          <Button size="sm" variant="outline" onClick={() => void load(true)}>
            Try again
          </Button>
        </AlertDescription>
      </Alert>
    );
  }

  const { totals, awaiting, byProductType } = stats;

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-xs text-muted-foreground">
          Figures updated {formatDateTime(stats.generatedAt)}
        </p>
        <Button
          variant="outline"
          size="sm"
          onClick={() => void load(true)}
          disabled={refreshing}
        >
          <RefreshCw
            className={cn('h-3.5 w-3.5', refreshing && 'animate-spin')}
            aria-hidden
          />
          Refresh
        </Button>
      </div>

      {/* Queue sizes and holdings at a glance. */}
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatTile
          icon={ClipboardCheck}
          label="Awaiting review"
          value={awaiting.storageReview}
          hint={
            awaiting.oldestStorageReviewSubmittedAt
              ? `Oldest since ${formatDateTime(awaiting.oldestStorageReviewSubmittedAt)}`
              : 'Nothing waiting'
          }
        />
        <StatTile
          icon={PackageCheck}
          label="In storage"
          value={totals.byStorageStatus.STORED}
          hint="Devices the store is holding"
        />
        <StatTile
          icon={Undo2}
          label="Awaiting release"
          value={awaiting.releaseDecision}
          hint={
            awaiting.oldestReleaseRequestedAt
              ? `Oldest since ${formatDateTime(awaiting.oldestReleaseRequestedAt)}`
              : 'Nothing waiting'
          }
        />
        <StatTile
          icon={Boxes}
          label="Devices registered"
          value={totals.devices}
          hint={`${totals.users} registered ${totals.users === 1 ? 'user' : 'users'}`}
        />
      </div>

      {/* The per-category cross-tab. */}
      <section className="space-y-3">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h2 className="font-semibold">Devices by category</h2>
            <p className="text-sm text-muted-foreground">
              How each kind of device is distributed across the storage
              lifecycle.
            </p>
          </div>
          <ul className="flex flex-wrap items-center gap-4">
            {STATUS_COLUMNS.map((column) => (
              <li
                key={column.key}
                className="flex items-center gap-1.5 text-xs text-muted-foreground"
              >
                <span
                  className={cn('h-2 w-2 rounded-full', column.bar)}
                  aria-hidden
                />
                {column.label}
              </li>
            ))}
          </ul>
        </div>

        <div className="rounded-lg border border-border/70">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Category</TableHead>
                {STATUS_COLUMNS.map((column) => (
                  <TableHead key={column.key} className="text-right">
                    {column.label}
                  </TableHead>
                ))}
                <TableHead className="text-right">Total</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {byProductType.map((row) => (
                <TableRow key={row.productType}>
                  <TableCell className="min-w-[180px]">
                    <span className="font-medium">
                      {PRODUCT_TYPE_LABELS[row.productType]}
                    </span>
                    <StackedBar row={row} />
                  </TableCell>
                  {STATUS_COLUMNS.map((column) => (
                    <TableCell
                      key={column.key}
                      className={cn(
                        'text-right tabular-nums',
                        column.key === 'PENDING' &&
                          row.byStorageStatus.PENDING > 0 &&
                          'font-semibold text-amber-700',
                        row.byStorageStatus[column.key] === 0 &&
                          'text-muted-foreground',
                      )}
                    >
                      {row.byStorageStatus[column.key]}
                    </TableCell>
                  ))}
                  <TableCell className="text-right font-semibold tabular-nums">
                    {row.total}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
            <TableFooter>
              <TableRow>
                <TableCell className="font-semibold">All categories</TableCell>
                {STATUS_COLUMNS.map((column) => (
                  <TableCell
                    key={column.key}
                    className="text-right font-semibold tabular-nums"
                  >
                    {totals.byStorageStatus[column.key]}
                  </TableCell>
                ))}
                <TableCell className="text-right font-semibold tabular-nums">
                  {totals.devices}
                </TableCell>
              </TableRow>
            </TableFooter>
          </Table>
        </div>
      </section>

      {/* Release-request outcomes. */}
      <section className="space-y-3">
        <div>
          <h2 className="font-semibold">Release requests</h2>
          <p className="text-sm text-muted-foreground">
            Decisions taken on owners’ requests to collect their devices.
          </p>
        </div>
        <dl className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {(
            [
              ['Total raised', totals.releaseRequests.total],
              ['Awaiting decision', totals.releaseRequests.byStatus.PENDING],
              ['Approved', totals.releaseRequests.byStatus.APPROVED],
              ['Rejected', totals.releaseRequests.byStatus.REJECTED],
            ] as const
          ).map(([label, value]) => (
            <div
              key={label}
              className="rounded-lg border border-border/70 bg-white px-5 py-4"
            >
              <dt className="text-xs text-muted-foreground">{label}</dt>
              <dd className="mt-1 text-2xl font-semibold tabular-nums">
                {value}
              </dd>
            </div>
          ))}
        </dl>
      </section>
    </div>
  );
}
