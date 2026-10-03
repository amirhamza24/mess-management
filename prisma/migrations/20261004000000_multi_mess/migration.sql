-- Multi-mess (multi-tenant) upgrade.
--
-- Turns the single-mess schema into isolated messes with platform admins.
-- Existing data is preserved: if the database already holds a mess (the old
-- single "mess" row, members or monthly cycles), it becomes one ACTIVE mess
-- with id 'main', and each member keeps their account's previous role.

-- CreateEnum
CREATE TYPE "PlatformRole" AS ENUM ('super_admin', 'user');

-- CreateEnum
CREATE TYPE "MessStatus" AS ENUM ('pending', 'active', 'inactive', 'rejected');

-- CreateTable
CREATE TABLE "messes" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "name_key" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "address" TEXT NOT NULL,
    "description" TEXT,
    "status" "MessStatus" NOT NULL DEFAULT 'pending',
    "created_by" TEXT NOT NULL,
    "approved_by" TEXT,
    "approved_at" TIMESTAMP(3),
    "rejected_by" TEXT,
    "rejected_at" TIMESTAMP(3),
    "rejection_reason" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "messes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "mess_activities" (
    "id" TEXT NOT NULL,
    "mess_id" TEXT NOT NULL,
    "actor_id" TEXT,
    "actor_name" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "note" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "mess_activities_pkey" PRIMARY KEY ("id")
);

-- New columns (mess_id is filled below before it becomes NOT NULL)
ALTER TABLE "users"
  ADD COLUMN "platform_role" "PlatformRole" NOT NULL DEFAULT 'user',
  ADD COLUMN "requested_mess_id" TEXT;

ALTER TABLE "members"
  ADD COLUMN "mess_id" TEXT,
  ADD COLUMN "role" "Role" NOT NULL DEFAULT 'member';

ALTER TABLE "monthly_cycles" ADD COLUMN "mess_id" TEXT;

-- Backfill: move the existing single mess into the new table
DO $$
DECLARE
  v_creator TEXT;
  v_name    TEXT;
  v_address TEXT;
BEGIN
  IF EXISTS (SELECT 1 FROM "mess")
     OR EXISTS (SELECT 1 FROM "members")
     OR EXISTS (SELECT 1 FROM "monthly_cycles") THEN

    SELECT "id" INTO v_creator FROM "users"
     WHERE "role" = 'manager' AND "status" = 'approved'
     ORDER BY "created_at" LIMIT 1;
    IF v_creator IS NULL THEN
      SELECT "id" INTO v_creator FROM "users" ORDER BY "created_at" LIMIT 1;
    END IF;
    IF v_creator IS NULL THEN
      RAISE EXCEPTION 'Cannot migrate existing mess data: no user account exists to own it';
    END IF;

    SELECT "name", "address" INTO v_name, v_address FROM "mess" WHERE "id" = 'main';
    v_name := COALESCE(NULLIF(trim(v_name), ''), 'My Mess');

    INSERT INTO "messes" ("id", "name", "name_key", "slug", "address", "status",
                          "created_by", "approved_by", "approved_at", "updated_at")
    VALUES (
      'main',
      v_name,
      lower(regexp_replace(trim(v_name), '\s+', ' ', 'g')),
      COALESCE(NULLIF(trim(both '-' from regexp_replace(lower(v_name), '[^a-z0-9]+', '-', 'g')), ''), 'mess') || '-main',
      COALESCE(v_address, ''),
      'active',
      v_creator, v_creator, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
    );

    INSERT INTO "mess_activities" ("id", "mess_id", "actor_id", "actor_name", "action", "note")
    VALUES (gen_random_uuid()::text, 'main', NULL, 'System', 'migrated', 'Existing mess moved to multi-mess setup');

    UPDATE "members" SET "mess_id" = 'main';
    UPDATE "monthly_cycles" SET "mess_id" = 'main';

    -- The mess role used to live on the account
    UPDATE "members" m SET "role" = u."role"
      FROM "users" u WHERE m."user_id" = u."id";
  END IF;
END $$;

ALTER TABLE "members" ALTER COLUMN "mess_id" SET NOT NULL;
ALTER TABLE "monthly_cycles" ALTER COLUMN "mess_id" SET NOT NULL;

-- Old single-mess structures
DROP INDEX "members_email_key";
DROP INDEX "monthly_cycles_year_month_key";
ALTER TABLE "users" DROP COLUMN "role";
DROP TABLE "mess";

-- CreateIndex
CREATE UNIQUE INDEX "messes_name_key_key" ON "messes"("name_key");
CREATE UNIQUE INDEX "messes_slug_key" ON "messes"("slug");
CREATE INDEX "messes_status_created_at_idx" ON "messes"("status", "created_at");
CREATE INDEX "mess_activities_mess_id_created_at_idx" ON "mess_activities"("mess_id", "created_at");
CREATE INDEX "users_requested_mess_id_idx" ON "users"("requested_mess_id");
CREATE INDEX "members_mess_id_role_idx" ON "members"("mess_id", "role");
CREATE UNIQUE INDEX "members_mess_id_user_id_key" ON "members"("mess_id", "user_id");
CREATE UNIQUE INDEX "members_mess_id_email_key" ON "members"("mess_id", "email");
CREATE UNIQUE INDEX "monthly_cycles_mess_id_year_month_key" ON "monthly_cycles"("mess_id", "year", "month");

-- AddForeignKey
ALTER TABLE "users" ADD CONSTRAINT "users_requested_mess_id_fkey" FOREIGN KEY ("requested_mess_id") REFERENCES "messes"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "messes" ADD CONSTRAINT "messes_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "messes" ADD CONSTRAINT "messes_approved_by_fkey" FOREIGN KEY ("approved_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "messes" ADD CONSTRAINT "messes_rejected_by_fkey" FOREIGN KEY ("rejected_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "mess_activities" ADD CONSTRAINT "mess_activities_mess_id_fkey" FOREIGN KEY ("mess_id") REFERENCES "messes"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "members" ADD CONSTRAINT "members_mess_id_fkey" FOREIGN KEY ("mess_id") REFERENCES "messes"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "monthly_cycles" ADD CONSTRAINT "monthly_cycles_mess_id_fkey" FOREIGN KEY ("mess_id") REFERENCES "messes"("id") ON DELETE CASCADE ON UPDATE CASCADE;
