-- AlterTable: download_count and file_size from INTEGER to BIGINT
ALTER TABLE "skills" ALTER COLUMN "download_count" SET DATA TYPE BIGINT;
ALTER TABLE "skill_packages" ALTER COLUMN "file_size" SET DATA TYPE BIGINT;
