import { Prisma } from '@prisma/client';

/** True when Prisma reports a unique-constraint violation (P2002). */
export function isUniqueViolation(error: unknown, indexHint?: string): boolean {
  if (!(error instanceof Prisma.PrismaClientKnownRequestError)) return false;
  if (error.code !== 'P2002') return false;
  if (!indexHint) return true;
  const target = error.meta?.target;
  const targetText = Array.isArray(target) ? target.join(',') : String(target ?? '');
  return targetText.includes(indexHint);
}

/** True when Prisma reports that a required record was not found (P2025). */
export function isRecordNotFound(error: unknown): boolean {
  return (
    error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2025'
  );
}
