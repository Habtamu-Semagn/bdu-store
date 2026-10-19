-- Drop the legacy phoneNumber column.
-- Authentication now uses universityId only (format: bdu########).

ALTER TABLE "User"
DROP CONSTRAINT IF EXISTS "User_phoneNumber_key";

DROP INDEX IF EXISTS "User_phoneNumber_key";

ALTER TABLE "User"
DROP COLUMN "phoneNumber";