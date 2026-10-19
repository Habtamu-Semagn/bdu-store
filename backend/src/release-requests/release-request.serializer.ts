import { ReleaseRequest } from '@prisma/client';
import { toDeviceOwnerSummary, DeviceOwnerSummary } from '../users/user.mapper';
import { ReleaseRequestView, toReleaseRequestView } from '../devices/device.serializer';

export interface AdminReleaseDeviceSummary {
  id: string;
  storageToken: string | null;
  storageStatus: string;
  productType: string;
  productName: string;
  brand: string | null;
  model: string | null;
  serialNumber: string | null;
}

export interface AdminReleaseRequestView extends ReleaseRequestView {
  deviceId: string;
  reviewedBy: string | null;
  device: AdminReleaseDeviceSummary;
  owner: DeviceOwnerSummary;
}

type ReleaseWithDeviceAndOwner = ReleaseRequest & {
  device: {
    id: string;
    storageToken: string | null;
    storageStatus: string;
    productType: string;
    productName: string;
    brand: string | null;
    model: string | null;
    serialNumber: string | null;
    user: { id: string; fullName: string; universityId: string };
  };
};

/** Flattens a release request plus its device and owner for the admin tables. */
export function toAdminReleaseRequestView(
  request: ReleaseWithDeviceAndOwner,
): AdminReleaseRequestView {
  const { device } = request;
  return {
    ...toReleaseRequestView(request),
    deviceId: device.id,
    reviewedBy: request.reviewedBy,
    device: {
      id: device.id,
      storageToken: device.storageToken,
      storageStatus: device.storageStatus,
      productType: device.productType,
      productName: device.productName,
      brand: device.brand,
      model: device.model,
      serialNumber: device.serialNumber,
    },
    owner: toDeviceOwnerSummary(device.user),
  };
}

/** Prisma `include` for admin release-request listings. */
export const releaseRequestAdminInclude = {
  device: { include: { user: true } },
} as const;
