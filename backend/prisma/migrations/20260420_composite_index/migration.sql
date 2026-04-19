-- CreateIndex
CREATE INDEX IF NOT EXISTS "download_stats_skill_package_id_created_at_idx" ON "download_stats"("skill_package_id", "created_at");
