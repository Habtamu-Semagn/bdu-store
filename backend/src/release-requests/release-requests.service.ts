import {
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { RELEASE_STATUS, STORAGE_STATUS } from '../common/constants';
import { isUniqueViolation } from '../common/prisma-errors';
import { PrismaService } from '../common/prisma.service';
import {
  deviceReleaseInclude,
  ReleaseRequestView,
  toDeviceView,
  toReleaseRequestView,
} from '../devices/device.serializer';
import {
  AdminReleaseRequestView,
  releaseRequestAdminInclude,
  toAdminReleaseRequestView,
} from './release-request.serializer';

export interface ReleaseDecisionResult {
  releaseRequest: ReleaseRequestView;
  device: ReturnType<typeof toDeviceView>;
}

@Injectable()
export class ReleaseRequestsService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Creates a PENDING release request for a device the caller owns.
   *
   * Eligibility is checked here and, more importantly, enforced by the
   * `ReleaseRequest_one_pending_per_device` partial unique index, so two
   * simultaneous requests can never both succeed.
   */
  async createForDevice(
    deviceId: string,
    userId: string,
  ): Promise<ReleaseRequestView> {
    const device = await this.prisma.device.findUnique({ where: { id: deviceId } });

    if (!device) {
      throw new NotFoundException(`Device ${deviceId} was not found.`);
    }
    if (device.userId !== userId) {
      throw new ForbiddenException('You do not have access to this device.');
    }
    if (device.storageStatus !== STORAGE_STATUS.STORED) {
      throw new ConflictException(
        'Only devices currently held in the store can be released. This device is not in storage.',
      );
    }

    try {
      const created = await this.prisma.releaseRequest.create({
        data: { deviceId, status: RELEASE_STATUS.PENDING },
      });
      return toReleaseRequestView(created);
    } catch (error) {
      if (isUniqueViolation(error, 'ReleaseRequest')) {
        throw new ConflictException(
          'A release request for this device is already awaiting review.',
        );
      }
      throw error;
    }
  }

  async listByStatus(status: string): Promise<AdminReleaseRequestView[]> {
    const requests = await this.prisma.releaseRequest.findMany({
      where: { status },
      orderBy: { requestedAt: 'desc' },
      include: releaseRequestAdminInclude,
    });
    return requests.map(toAdminReleaseRequestView);
  }

  /**
   * Approving a release marks the request APPROVED and moves the device to
   * RELEASED, both inside one transaction. Physical handover is confirmed by
   * the store clerk; the status change records that the store released it.
   */
  async approve(
    releaseRequestId: string,
    adminId: string,
  ): Promise<ReleaseDecisionResult> {
    return this.prisma.$transaction(async (tx) => {
      const request = await tx.releaseRequest.findUnique({
        where: { id: releaseRequestId },
      });

      if (!request) {
        throw new NotFoundException(
          `Release request ${releaseRequestId} was not found.`,
        );
      }
      if (request.status !== RELEASE_STATUS.PENDING) {
        throw new ConflictException(
          'This release request has already been decided.',
        );
      }

      // Compare-and-swap: only one caller can move PENDING -> APPROVED.
      const claimed = await tx.releaseRequest.updateMany({
        where: { id: releaseRequestId, status: RELEASE_STATUS.PENDING },
        data: {
          status: RELEASE_STATUS.APPROVED,
          reviewedAt: new Date(),
          reviewedBy: adminId,
        },
      });
      if (claimed.count === 0) {
        throw new ConflictException(
          'This release request was decided by another administrator.',
        );
      }

      const released = await tx.device.updateMany({
        where: { id: request.deviceId, storageStatus: STORAGE_STATUS.STORED },
        data: { storageStatus: STORAGE_STATUS.RELEASED },
      });
      if (released.count === 0) {
        throw new ConflictException(
          'This device is no longer held in the store, so it cannot be released.',
        );
      }

      const updatedRequest = await tx.releaseRequest.findUniqueOrThrow({
        where: { id: releaseRequestId },
      });
      const updatedDevice = await tx.device.findUniqueOrThrow({
        where: { id: request.deviceId },
        include: deviceReleaseInclude,
      });

      return {
        releaseRequest: toReleaseRequestView(updatedRequest),
        device: toDeviceView(updatedDevice),
      };
    });
  }

  /**
   * Rejecting a release request records the decision and a required reason.
   * The device stays STORED, so the owner may request release again later.
   */
  async reject(
    releaseRequestId: string,
    adminId: string,
    rejectionReason: string,
  ): Promise<ReleaseDecisionResult> {
    const reason = rejectionReason?.trim();
    if (!reason) {
      throw new ConflictException('A rejection reason is required.');
    }

    return this.prisma.$transaction(async (tx) => {
      const request = await tx.releaseRequest.findUnique({
        where: { id: releaseRequestId },
      });

      if (!request) {
        throw new NotFoundException(
          `Release request ${releaseRequestId} was not found.`,
        );
      }
      if (request.status !== RELEASE_STATUS.PENDING) {
        throw new ConflictException(
          'This release request has already been decided.',
        );
      }

      const claimed = await tx.releaseRequest.updateMany({
        where: { id: releaseRequestId, status: RELEASE_STATUS.PENDING },
        data: {
          status: RELEASE_STATUS.REJECTED,
          reviewedAt: new Date(),
          reviewedBy: adminId,
          rejectionReason: reason,
        },
      });
      if (claimed.count === 0) {
        throw new ConflictException(
          'This release request was decided by another administrator.',
        );
      }

      const updatedRequest = await tx.releaseRequest.findUniqueOrThrow({
        where: { id: releaseRequestId },
      });
      // The device is deliberately untouched: it remains STORED.
      const device = await tx.device.findUniqueOrThrow({
        where: { id: request.deviceId },
        include: deviceReleaseInclude,
      });

      return {
        releaseRequest: toReleaseRequestView(updatedRequest),
        device: toDeviceView(device),
      };
    });
  }
}
