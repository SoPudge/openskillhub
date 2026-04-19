-- Add admin role and banned fields to users
ALTER TABLE "users" ADD COLUMN "role" VARCHAR(20) NOT NULL DEFAULT 'user';
ALTER TABLE "users" ADD COLUMN "banned" BOOLEAN NOT NULL DEFAULT false;

-- Add featured field to skills
ALTER TABLE "skills" ADD COLUMN "featured" BOOLEAN NOT NULL DEFAULT false;

-- Index for admin queries
CREATE INDEX "users_role_idx" ON "users"("role");
CREATE INDEX "skills_featured_idx" ON "skills"("featured");
