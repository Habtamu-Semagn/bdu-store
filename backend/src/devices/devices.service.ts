import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Device } from '@prisma/client';
import { ROLE, SERIAL_REQUIRED_PRODUCT_TYPES } from '../common/constants';
import { PrismaService } from '../common/prisma.service';
import {
  DeviceView,
  deviceReleaseInclude,
  toDeviceView,
} from './device.serializer';
import { DeviceRegistrationDto } from './dto/create-device.dto';

/** Optional text fields are stored as NULL rather than empty strings. */
function clean(value: string | undefined): string | null {
  const trimmed = value?.trim();
  return trimmed && trimmed.length > 0 ? trimmed : null;
}

@Injectable()
export class DevicesService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Records a storage request for the authenticated user. The device starts
   * as PENDING: submitting a request does not mean the store has received it.
   */
  async create(userId: string, dto: DeviceRegistrationDto): Promise<DeviceView> {
    const device = await this.prisma.device.create({
      data: {
        userId,
        productType: dto.productType,
        productName: dto.productName.trim(),
        brand: clean(dto.brand),
        model: clean(dto.model),
        serialNumber: clean(dto.serialNumber),
        description: clean(dto.description),
        storageStatus: 'PENDING',
      },
    });

    return toDeviceView(device);
  }

  async listMine(userId: string): Promise<DeviceView[]> {
    const devices = await this.prisma.device.findMany({
      where: { userId },
      orderBy: { storageSubmittedAt: 'desc' },
      include: deviceReleaseInclude,
    });
    return devices.map((device) => toDeviceView(device));
  }

  /**
   * Loads a device and enforces ownership. Administrators may inspect any
   * device; regular users only their own.
   */
  async getVisibleToUser(
    deviceId: string,
    user: { id: string; role: string },
  ): Promise<DeviceView> {
    const device = await this.prisma.device.findUnique({
      where: { id: deviceId },
      include: deviceReleaseInclude,
    });

    if (!device) {
      throw new NotFoundException(`Device ${deviceId} was not found.`);
    }
    if (device.userId !== user.id && user.role !== ROLE.ADMIN) {
      throw new ForbiddenException('You do not have access to this device.');
    }

    return toDeviceView(device);
  }

  async requireOwnedDevice(deviceId: string, userId: string): Promise<Device> {
    const device = await this.prisma.device.findUnique({ where: { id: deviceId } });
    if (!device) {
      throw new NotFoundException(`Device ${deviceId} was not found.`);
    }
    if (device.userId !== userId) {
      throw new ForbiddenException('You do not have access to this device.');
    }
    return device;
  }

  static requiresSerialNumber(productType: string): boolean {
    return SERIAL_REQUIRED_PRODUCT_TYPES.includes(
      productType as (typeof SERIAL_REQUIRED_PRODUCT_TYPES)[number],
    );
  }
}
