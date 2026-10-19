'use client';

import Link from 'next/link';
import { useCallback, useEffect, useState } from 'react';
import { AlertCircle, Laptop, Plus } from 'lucide-react';
import { DeviceCard } from '@/components/device-card';
import { EmptyState } from '@/components/empty-state';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { useAuth } from '@/context/auth-context';
import { ApiError, api } from '@/lib/api';
import type { Device } from '@/types/api';

export default function DashboardPage() {
  const { user } = useAuth();
  const [devices, setDevices] = useState<Device[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setError(null);
    try {
      setDevices(await api.devices.listMine());
    } catch (caught) {
      setError(
        caught instanceof ApiError
          ? caught.message
          : 'Could not load your devices.',
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const inStorage = devices.filter((d) => d.storageStatus === 'STORED').length;
  const awaitingReview = devices.filter(
    (d) => d.storageStatus === 'PENDING',
  ).length;

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="space-y-1">
          <h1 className="text-2xl font-semibold tracking-tight">
            Welcome, {user?.fullName ?? 'campus user'}
          </h1>
          <p className="text-sm text-muted-foreground">
            {devices.length === 0
              ? 'You have not registered any devices for storage yet.'
              : `${devices.length} device${devices.length === 1 ? '' : 's'} registered · ${inStorage} in storage · ${awaitingReview} awaiting review.`}
          </p>
        </div>
        <Button asChild>
          <Link href="/devices/register">
            <Plus className="h-4 w-4" aria-hidden />
            Register device
          </Link>
        </Button>
      </div>

      {error ? (
        <Alert variant="destructive">
          <AlertCircle />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      ) : null}

      {loading ? (
        <div className="space-y-4">
          {[0, 1].map((index) => (
            <Skeleton key={index} className="h-56 w-full" />
          ))}
        </div>
      ) : devices.length === 0 ? (
        <EmptyState
          icon={Laptop}
          title="No storage requests yet"
          description="Register a computer, laptop, phone or tablet and hand it over at the campus store. An administrator approves storage once the device is received."
          action={
            <Button asChild>
              <Link href="/devices/register">
                <Plus className="h-4 w-4" aria-hidden />
                Register your first device
              </Link>
            </Button>
          }
        />
      ) : (
        <div className="space-y-4">
          {devices.map((device) => (
            <DeviceCard key={device.id} device={device} onChanged={load} />
          ))}
        </div>
      )}
    </div>
  );
}
