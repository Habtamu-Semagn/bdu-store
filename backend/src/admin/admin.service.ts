import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { STORAGE_STATUS } from '../common/constants';
import { isUniqueViolation } from '../common/prisma-errors';
import { PrismaService } from '../common/prisma.service';
import {
  deviceAdminInclude,
  DeviceView,
  toDeviceView,
} from '../devices/device.serializer';
import {
  AdminReleaseRequestView,
} from '../release-requests/release-request.serializer';
import { ReleaseRequestsService } from '../release-requests/release-requests.service';
import { generateStorageToken } from './storage-token';

const MAX_TOKEN_ATTEMPTS = 5;

@Injectable()
export class AdminService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly releaseRequests: ReleaseRequestsService,
  ) {}

  /** Storage requests filtered by device storage status. */
  async listStorageRequests(status: string): Promise<DeviceView[]> {
    const devices = await this.prisma.device.findMany({
      where: { storageStatus: status },
      orderBy: { storageSubmittedAt: 'desc' },
      include: deviceAdminInclude,
    });
    return devices.map((device) => toDeviceView(device, { includeOwner: true }));
  }

  /** Every device currently held in the store. */
  async listStoredDevices(): Promise<DeviceView[]> {
    return this.listStorageRequests(STORAGE_STATUS.STORED);
  }

  /** Release requests filtered by status, newest first. */
  listReleaseRequests(status: string): Promise<AdminReleaseRequestView[]> {
    return this.releaseRequests.listByStatus(status);
  }

  /**
   * Approves a storage request: issues a unique token, moves the device to
   * STORED, and records the approving administrator and the date — all in one
   * transaction. The status change is a compare-and-swap so two administrators
   * cannot both approve the same request.
   */
  async approveStorage(deviceId: string, adminId: string): Promise<DeviceView> {
    for (let attempt = 1; attempt <= MAX_TOKEN_ATTEMPTS; attempt += 1) {
      const token = generateStorageToken();
      try {
        return await this.prisma.$transaction(async (tx) => {
          const device = await tx.device.findUnique({ where: { id: deviceId } });
          if (!device) {
            throw new NotFoundException(`Device ${deviceId} was not found.`);
          }
          if (device.storageStatus !== STORAGE_STATUS.PENDING) {
            throw new ConflictException(
              'This storage request has already been decided.',
            );
          }

          const approved = await tx.device.updateMany({
            where: { id: deviceId, storageStatus: STORAGE_STATUS.PENDING },
            data: {
              storageStatus: STORAGE_STATUS.STORED,
              storageToken: token,
              storageApprovedAt: new Date(),
              storageApprovedBy: adminId,
            },
          });
          if (approved.count === 0) {
            throw new ConflictException(
              'This storage request was decided by another administrator.',
            );
          }

          const updated = await tx.device.findUniqueOrThrow({
            where: { id: deviceId },
            include: deviceAdminInclude,
          });
          return toDeviceView(updated, { includeOwner: true });
        });
      } catch (error) {
        // Astronomically unlikely, but retry with a fresh token rather than
        // failing the approval outright.
        const tokenCollision = isUniqueViolation(error, 'storageToken');
        if (tokenCollision && attempt < MAX_TOKEN_ATTEMPTS) {
          continue;
        }
        throw error;
      }
    }

    throw new ConflictException(
      'Could not allocate a unique storage token. Please try again.',
    );
  }

  /**
   * Rejects a storage request. A reason is mandatory and is shown to the
   * device owner on their dashboard. No token is issued.
   */
  async rejectStorage(
    deviceId: string,
    adminId: string,
    rejectionReason: string,
  ): Promise<DeviceView> {
    const reason = rejectionReason?.trim();
    if (!reason) {
      throw new BadRequestException('A rejection reason is required.');
    }

    return this.prisma.$transaction(async (tx) => {
      const device = await tx.device.findUnique({ where: { id: deviceId } });
      if (!device) {
        throw new NotFoundException(`Device ${deviceId} was not found.`);
      }
      if (device.storageStatus !== STORAGE_STATUS.PENDING) {
        throw new ConflictException(
          'This storage request has already been decided.',
        );
      }

      const rejected = await tx.device.updateMany({
        where: { id: deviceId, storageStatus: STORAGE_STATUS.PENDING },
        data: {
          storageStatus: STORAGE_STATUS.REJECTED,
          storageRejectedAt: new Date(),
          storageRejectedBy: adminId,
          storageRejectionReason: reason,
        },
      });
      if (rejected.count === 0) {
        throw new ConflictException(
          'This storage request was decided by another administrator.',
        );
      }

      const updated = await tx.device.findUniqueOrThrow({
        where: { id: deviceId },
        include: deviceAdminInclude,
      });
      return toDeviceView(updated, { includeOwner: true });
    });
  }
}
