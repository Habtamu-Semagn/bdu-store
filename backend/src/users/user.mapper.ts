import { User } from '@prisma/client';

/** The shape of a user that is safe to return to a client. */
export interface PublicUser {
  id: string;
  fullName: string;
  universityId: string;
  role: string;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Strips the password hash (and anything else not meant for the wire) from a
 * user record. Used everywhere a user is serialised, so a hash can never be
 * returned by accident.
 */
export function toPublicUser(user: User): PublicUser {
  return {
    id: user.id,
    fullName: user.fullName,
    universityId: user.universityId,
    role: user.role,
    createdAt: user.createdAt,
    updatedAt: user.updatedAt,
  };
}

/** Owner details as shown to administrators. Never includes the hash. */
export interface DeviceOwnerSummary {
  id: string;
  fullName: string;
  universityId: string;
}

export function toDeviceOwnerSummary(user: {
  id: string;
  fullName: string;
  universityId: string;
}): DeviceOwnerSummary {
  return {
    id: user.id,
    fullName: user.fullName,
    universityId: user.universityId,
  };
}
