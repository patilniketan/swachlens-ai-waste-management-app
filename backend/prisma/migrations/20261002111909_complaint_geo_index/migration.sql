-- CreateIndex
CREATE INDEX "Complaint_status_latitude_longitude_idx" ON "Complaint"("status", "latitude", "longitude");
