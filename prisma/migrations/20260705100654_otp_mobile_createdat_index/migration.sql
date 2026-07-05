-- DropIndex
DROP INDEX "OtpRequest_mobileNumber_idx";

-- CreateIndex
CREATE INDEX "OtpRequest_mobileNumber_createdAt_idx" ON "OtpRequest"("mobileNumber", "createdAt");
