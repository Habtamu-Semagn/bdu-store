/** Storage lifecycle for a device. */
export const STORAGE_STATUS = {
  PENDING: 'PENDING',
  STORED: 'STORED',
  REJECTED: 'REJECTED',
  RELEASED: 'RELEASED',
} as const;
export type StorageStatus = (typeof STORAGE_STATUS)[keyof typeof STORAGE_STATUS];

/** Lifecycle for a release request. */
export const RELEASE_STATUS = {
  PENDING: 'PENDING',
  APPROVED: 'APPROVED',
  REJECTED: 'REJECTED',
} as const;
export type ReleaseStatus = (typeof RELEASE_STATUS)[keyof typeof RELEASE_STATUS];

/** Roles. */
export const ROLE = {
  USER: 'USER',
  ADMIN: 'ADMIN',
} as const;
export type Role = (typeof ROLE)[keyof typeof ROLE];

/** Product types accepted at device registration. */
export const PRODUCT_TYPE = {
  DESKTOP_COMPUTER: 'DESKTOP_COMPUTER',
  LAPTOP: 'LAPTOP',
  MOBILE_PHONE: 'MOBILE_PHONE',
  TABLET: 'TABLET',
  OTHER: 'OTHER',
} as const;
export type ProductType = (typeof PRODUCT_TYPE)[keyof typeof PRODUCT_TYPE];

export const PRODUCT_TYPES: ProductType[] = Object.values(PRODUCT_TYPE);

/** Product types for which a serial number is mandatory. */
export const SERIAL_REQUIRED_PRODUCT_TYPES: ProductType[] = [
  PRODUCT_TYPE.DESKTOP_COMPUTER,
  PRODUCT_TYPE.LAPTOP,
  PRODUCT_TYPE.MOBILE_PHONE,
  PRODUCT_TYPE.TABLET,
];

export const PRODUCT_TYPE_LABELS: Record<ProductType, string> = {
  DESKTOP_COMPUTER: 'Desktop Computer',
  LAPTOP: 'Laptop',
  MOBILE_PHONE: 'Mobile Phone',
  TABLET: 'Tablet',
  OTHER: 'Other',
};

export const STORAGE_STATUS_VALUES: StorageStatus[] = Object.values(STORAGE_STATUS);
export const RELEASE_STATUS_VALUES: ReleaseStatus[] = Object.values(RELEASE_STATUS);
