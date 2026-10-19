import { Injectable } from '@nestjs/common';
import {
  PRODUCT_TYPES,
  ProductType,
  RELEASE_STATUS,
  RELEASE_STATUS_VALUES,
  ReleaseStatus,
  STORAGE_STATUS,
  STORAGE_STATUS_VALUES,
  StorageStatus,
} from '../common/constants';
import { PrismaService } from '../common/prisma.service';

export type StorageStatusCounts = Record<StorageStatus, number>;
export type ReleaseStatusCounts = Record<ReleaseStatus, number>;

export interface ProductTypeBreakdown {
  productType: ProductType;
  total: number;
  byStorageStatus: StorageStatusCounts;
}

export interface AdminStats {
  generatedAt: string;
  totals: {
    users: number;
    devices: number;
    byStorageStatus: StorageStatusCounts;
    releaseRequests: {
      total: number;
      byStatus: ReleaseStatusCounts;
    };
  };
  /** The per-category cross-tab: awaiting / stored / rejected / released. */
  byProductType: ProductTypeBreakdown[];
  /** Work sitting in a queue, i.e. what the store still has to act on. */
  awaiting: {
    storageReview: number;
    releaseDecision: number;
    /** When the longest-waiting storage request was submitted. */
    oldestStorageReviewSubmittedAt: string | null;
    oldestReleaseRequestedAt: string | null;
  };
}

function emptyStorageCounts(): StorageStatusCounts {
  return STORAGE_STATUS_VALUES.reduce(
    (acc, status) => ({ ...acc, [status]: 0 }),
    {} as StorageStatusCounts,
  );
}

function emptyReleaseCounts(): ReleaseStatusCounts {
  return RELEASE_STATUS_VALUES.reduce(
    (acc, status) => ({ ...acc, [status]: 0 }),
    {} as ReleaseStatusCounts,
  );
}

/**
 * Read-only aggregate reporting for the administrator dashboard.
 *
 * Every figure is computed in PostgreSQL with `groupBy`, so the numbers stay
 * correct as the table grows instead of relying on the client to count a
 * paginated list.
 */
@Injectable()
export class AdminStatsService {
  constructor(private readonly prisma: PrismaService) {}

  async getStats(): Promise<AdminStats> {
    const [
      devicesByStatus,
      devicesByTypeAndStatus,
      releasesByStatus,
      userCount,
      oldestStorageReview,
      oldestRelease,
    ] = await Promise.all([
      this.prisma.device.groupBy({
        by: ['storageStatus'],
        _count: { _all: true },
      }),
      this.prisma.device.groupBy({
        by: ['productType', 'storageStatus'],
        _count: { _all: true },
      }),
      this.prisma.releaseRequest.groupBy({
        by: ['status'],
        _count: { _all: true },
      }),
      this.prisma.user.count(),
      this.prisma.device.findFirst({
        where: { storageStatus: STORAGE_STATUS.PENDING },
        orderBy: { storageSubmittedAt: 'asc' },
        select: { storageSubmittedAt: true },
      }),
      this.prisma.releaseRequest.findFirst({
        where: { status: RELEASE_STATUS.PENDING },
        orderBy: { requestedAt: 'asc' },
        select: { requestedAt: true },
      }),
    ]);

    const byStorageStatus = emptyStorageCounts();
    for (const row of devicesByStatus) {
      const status = row.storageStatus as StorageStatus;
      if (status in byStorageStatus) {
        byStorageStatus[status] = row._count._all;
      }
    }

    const byReleaseStatus = emptyReleaseCounts();
    for (const row of releasesByStatus) {
      const status = row.status as ReleaseStatus;
      if (status in byReleaseStatus) {
        byReleaseStatus[status] = row._count._all;
      }
    }

    // Seed every known product type so categories with no rows still appear.
    const typeCounts = new Map<ProductType, StorageStatusCounts>();
    for (const productType of PRODUCT_TYPES) {
      typeCounts.set(productType, emptyStorageCounts());
    }
    for (const row of devicesByTypeAndStatus) {
      const productType = row.productType as ProductType;
      const status = row.storageStatus as StorageStatus;
      const counts = typeCounts.get(productType);
      if (counts && status in counts) {
        counts[status] = row._count._all;
      }
    }

    const byProductType: ProductTypeBreakdown[] = PRODUCT_TYPES.map(
      (productType) => {
        const byStatus = typeCounts.get(productType) ?? emptyStorageCounts();
        return {
          productType,
          total: STORAGE_STATUS_VALUES.reduce(
            (sum, status) => sum + byStatus[status],
            0,
          ),
          byStorageStatus: byStatus,
        };
      },
    );

    const devices = STORAGE_STATUS_VALUES.reduce(
      (sum, status) => sum + byStorageStatus[status],
      0,
    );
    const releaseRequests = RELEASE_STATUS_VALUES.reduce(
      (sum, status) => sum + byReleaseStatus[status],
      0,
    );

    return {
      generatedAt: new Date().toISOString(),
      totals: {
        users: userCount,
        devices,
        byStorageStatus,
        releaseRequests: {
          total: releaseRequests,
          byStatus: byReleaseStatus,
        },
      },
      byProductType,
      awaiting: {
        storageReview: byStorageStatus[STORAGE_STATUS.PENDING],
        releaseDecision: byReleaseStatus[RELEASE_STATUS.PENDING],
        oldestStorageReviewSubmittedAt:
          oldestStorageReview?.storageSubmittedAt.toISOString() ?? null,
        oldestReleaseRequestedAt:
          oldestRelease?.requestedAt.toISOString() ?? null,
      },
    };
  }
}
