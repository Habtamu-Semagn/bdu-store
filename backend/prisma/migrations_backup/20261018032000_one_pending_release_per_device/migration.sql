-- Enforce "at most one PENDING release request per device" in the database.
--
-- The service layer already checks this inside a transaction, but only a
-- database constraint makes it true under concurrency: two simultaneous
-- requests for the same device cannot both be PENDING.
--
-- Prisma cannot express partial (filtered) indexes in schema.prisma, so this
-- migration owns the constraint. It is part of the migration history, so
-- `prisma migrate dev` does not report drift.
CREATE UNIQUE INDEX "ReleaseRequest_one_pending_per_device"
  ON "ReleaseRequest" ("deviceId")
  WHERE "status" = 'PENDING';
