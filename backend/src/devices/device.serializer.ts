import { Device, ReleaseRequest } from '@prisma/client';
import { DeviceOwnerSummary, toDeviceOwnerSummary } from '../users/user.mapper';
import { STORAGE_STATUS } from '../common/constants';

export interface ReleaseRequestView {
  id: string;
  status: string;
  requestedAt: Date;
  reviewedAt: Date | null;
  rejectionReason: string | null;
}

export interface DeviceView {
  id: string;
  productType: string;
  productName: string;
  brand: string | null;
  model: string | null;
  serialNumber: string | null;
  description: string | null;
  storageStatus: string;
  /** Issued only once storage has been approved. Null until then. */
  storageToken: string | null;
  storageSubmittedAt: Date;
  storageApprovedAt: Date | null;
  storageApprovedBy: string | null;
  storageRejectedAt: Date | null;
  storageRejectedBy: string | null;
  storageRejectionReason: string | null;
  createdAt: Date;
  updatedAt: Date;
  /** Most recent release request for this device, if any. */
  releaseRequest: ReleaseRequestView | null;
  /** True only when the device is stored and has no release request in flight. */
  canRequestRelease: boolean;
  owner?: DeviceOwnerSummary;
}

type DeviceWithReleases = Device & {
  releaseRequests?: ReleaseRequest[];
  user?: { id: string; fullName: string; universityId: string };
};

export function toReleaseRequestView(request: ReleaseRequest): ReleaseRequestView {
  return {
    id: request.id,
    status: request.status,
    requestedAt: request.requestedAt,
    reviewedAt: request.reviewedAt,
    rejectionReason: request.rejectionReason,
  };
}

/**
 * Latest release request wins: the list is expected to be ordered by
 * `requestedAt` descending, and only one request can be PENDING at a time.
 */
export function toDeviceView(
  device: DeviceWithReleases,
  options: { includeOwner?: boolean } = {},
): DeviceView {
  const latestRelease = device.releaseRequests?.[0]
    ? toReleaseRequestView(device.releaseRequests[0])
    : null;

  const view: DeviceView = {
    id: device.id,
    productType: device.productType,
    productName: device.productName,
    brand: device.brand,
    model: device.model,
    serialNumber: device.serialNumber,
    description: device.description,
    storageStatus: device.storageStatus,
    storageToken: device.storageToken,
    storageSubmittedAt: device.storageSubmittedAt,
    storageApprovedAt: device.storageApprovedAt,
    storageApprovedBy: device.storageApprovedBy,
    storageRejectedAt: device.storageRejectedAt,
    storageRejectedBy: device.storageRejectedBy,
    storageRejectionReason: device.storageRejectionReason,
    createdAt: device.createdAt,
    updatedAt: device.updatedAt,
    releaseRequest: latestRelease,
    canRequestRelease:
      device.storageStatus === STORAGE_STATUS.STORED &&
      latestRelease?.status !== 'PENDING',
  };

  if (options.includeOwner && device.user) {
    view.owner = toDeviceOwnerSummary(device.user);
  }

  return view;
}

/** Prisma `include` clause shared by every query that needs release history. */
export const deviceReleaseInclude = {
  releaseRequests: { orderBy: { requestedAt: 'desc' } },
} as const;

/** Same, plus the owner — used by the administrator tables. */
export const deviceAdminInclude = {
  releaseRequests: { orderBy: { requestedAt: 'desc' } },
  user: true,
} as const;

