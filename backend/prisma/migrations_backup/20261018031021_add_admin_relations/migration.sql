-- CreateIndex
CREATE INDEX "Device_userId_idx" ON "Device"("userId");

-- CreateIndex
CREATE INDEX "Device_storageStatus_idx" ON "Device"("storageStatus");

-- CreateIndex
CREATE INDEX "ReleaseRequest_status_idx" ON "ReleaseRequest"("status");

-- AddForeignKey
ALTER TABLE "Device" ADD CONSTRAINT "Device_storageApprovedBy_fkey" FOREIGN KEY ("storageApprovedBy") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Device" ADD CONSTRAINT "Device_storageRejectedBy_fkey" FOREIGN KEY ("storageRejectedBy") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReleaseRequest" ADD CONSTRAINT "ReleaseRequest_reviewedBy_fkey" FOREIGN KEY ("reviewedBy") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
