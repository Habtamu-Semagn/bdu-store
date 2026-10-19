export type Role = 'USER' | 'ADMIN';

export type StorageStatus = 'PENDING' | 'STORED' | 'REJECTED' | 'RELEASED';

export type ReleaseStatus = 'PENDING' | 'APPROVED' | 'REJECTED';

export type ProductType =
  | 'DESKTOP_COMPUTER'
  | 'LAPTOP'
  | 'MOBILE_PHONE'
  | 'TABLET'
  | 'OTHER';

export interface User {
  id: string;
  fullName: string;
  /** Bahir Dar University ID. Never an email. */
  universityId: string;
  role: Role;
  createdAt: string;
  updatedAt: string;
}

export interface ReleaseRequestView {
  id: string;
  status: ReleaseStatus;
  requestedAt: string;
  reviewedAt: string | null;
  rejectionReason: string | null;
}

export interface DeviceOwner {
  id: string;
  fullName: string;
  universityId: string;
}

export interface Device {
  id: string;
  productType: ProductType;
  productName: string;
  brand: string | null;
  model: string | null;
  serialNumber: string | null;
  description: string | null;
  storageStatus: StorageStatus;
  /** Null until an administrator approves storage. */
  storageToken: string | null;
  storageSubmittedAt: string;
  storageApprovedAt: string | null;
  storageApprovedBy: string | null;
  storageRejectedAt: string | null;
  storageRejectedBy: string | null;
  storageRejectionReason: string | null;
  createdAt: string;
  updatedAt: string;
  releaseRequest: ReleaseRequestView | null;
  /** True only when the device is STORED with no release request in flight. */
  canRequestRelease: boolean;
  owner?: DeviceOwner;
}

export interface AdminReleaseDeviceSummary {
  id: string;
  storageToken: string | null;
  storageStatus: StorageStatus;
  productType: ProductType;
  productName: string;
  brand: string | null;
  model: string | null;
  serialNumber: string | null;
}

export interface AdminReleaseRequest {
  id: string;
  deviceId: string;
  status: ReleaseStatus;
  requestedAt: string;
  reviewedAt: string | null;
  reviewedBy: string | null;
  rejectionReason: string | null;
  device: AdminReleaseDeviceSummary;
  owner: DeviceOwner;
}

export type StorageStatusCounts = Record<StorageStatus, number>;
export type ReleaseStatusCounts = Record<ReleaseStatus, number>;

export interface ProductTypeBreakdown {
  productType: ProductType;
  total: number;
  byStorageStatus: StorageStatusCounts;
}

/** Aggregate figures for the administrator dashboard. */
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
  byProductType: ProductTypeBreakdown[];
  awaiting: {
    storageReview: number;
    releaseDecision: number;
    oldestStorageReviewSubmittedAt: string | null;
    oldestReleaseRequestedAt: string | null;
  };
}

export interface RegisterInput {
  fullName: string;
  universityId: string;
  password: string;
  confirmPassword: string;
}

export interface LoginInput {
  universityId: string;
  password: string;
}

export interface DeviceInput {
  productType: ProductType;
  productName: string;
  brand?: string;
  model?: string;
  serialNumber?: string;
  description?: string;
}

export interface LoginResult {
  user: User;
  token: string;
}
