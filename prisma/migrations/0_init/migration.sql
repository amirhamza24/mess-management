-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateEnum
CREATE TYPE "Role" AS ENUM ('manager', 'member');

-- CreateEnum
CREATE TYPE "UserStatus" AS ENUM ('pending', 'approved', 'rejected', 'suspended');

-- CreateEnum
CREATE TYPE "MemberStatus" AS ENUM ('active', 'inactive');

-- CreateEnum
CREATE TYPE "CycleStatus" AS ENUM ('open', 'closed');

-- CreateEnum
CREATE TYPE "MonthlyMemberStatus" AS ENUM ('active', 'removed');

-- CreateEnum
CREATE TYPE "PaymentMethod" AS ENUM ('cash', 'bkash', 'nagad', 'bank', 'other');

-- CreateEnum
CREATE TYPE "PaymentPurpose" AS ENUM ('mess', 'rent');

-- CreateEnum
CREATE TYPE "FoodCategory" AS ENUM ('rice', 'fish', 'meat', 'chicken', 'egg', 'vegetable', 'dal', 'oil', 'salt', 'spice', 'onion', 'potato', 'grocery', 'other_food');

-- CreateEnum
CREATE TYPE "OtherCategory" AS ENUM ('electricity', 'gas', 'water', 'internet', 'cleaning', 'repair', 'maid', 'maintenance', 'miscellaneous');

-- CreateTable
CREATE TABLE "users" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "phone" TEXT,
    "password" TEXT NOT NULL,
    "role" "Role" NOT NULL DEFAULT 'member',
    "status" "UserStatus" NOT NULL DEFAULT 'pending',
    "approved_at" TIMESTAMP(3),
    "approved_by" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "mess" (
    "id" TEXT NOT NULL DEFAULT 'main',
    "name" TEXT NOT NULL,
    "address" TEXT,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "mess_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "members" (
    "id" TEXT NOT NULL,
    "user_id" TEXT,
    "full_name" TEXT NOT NULL,
    "email" TEXT,
    "phone" TEXT,
    "avatar_url" TEXT,
    "status" "MemberStatus" NOT NULL DEFAULT 'active',
    "joined_at" DATE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "left_at" DATE,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "members_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "monthly_cycles" (
    "id" TEXT NOT NULL,
    "year" INTEGER NOT NULL,
    "month" INTEGER NOT NULL,
    "status" "CycleStatus" NOT NULL DEFAULT 'open',
    "started_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "closed_at" TIMESTAMP(3),

    CONSTRAINT "monthly_cycles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "monthly_members" (
    "id" TEXT NOT NULL,
    "monthly_cycle_id" TEXT NOT NULL,
    "member_id" TEXT NOT NULL,
    "status" "MonthlyMemberStatus" NOT NULL DEFAULT 'active',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "monthly_members_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "meals" (
    "id" TEXT NOT NULL,
    "monthly_cycle_id" TEXT NOT NULL,
    "member_id" TEXT NOT NULL,
    "date" DATE NOT NULL,
    "breakfast" DECIMAL(4,1) NOT NULL DEFAULT 0,
    "lunch" DECIMAL(4,1) NOT NULL DEFAULT 0,
    "dinner" DECIMAL(4,1) NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "meals_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "food_expenses" (
    "id" TEXT NOT NULL,
    "monthly_cycle_id" TEXT NOT NULL,
    "date" DATE NOT NULL,
    "paid_by" TEXT,
    "category" "FoodCategory" NOT NULL,
    "description" TEXT,
    "amount" DECIMAL(12,2) NOT NULL,
    "note" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "food_expenses_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "payments" (
    "id" TEXT NOT NULL,
    "monthly_cycle_id" TEXT NOT NULL,
    "member_id" TEXT NOT NULL,
    "date" DATE NOT NULL,
    "amount" DECIMAL(12,2) NOT NULL,
    "payment_method" "PaymentMethod" NOT NULL DEFAULT 'cash',
    "purpose" "PaymentPurpose" NOT NULL DEFAULT 'mess',
    "note" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "payments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "house_rents" (
    "id" TEXT NOT NULL,
    "monthly_cycle_id" TEXT NOT NULL,
    "member_id" TEXT NOT NULL,
    "amount" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "note" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "house_rents_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "other_expenses" (
    "id" TEXT NOT NULL,
    "monthly_cycle_id" TEXT NOT NULL,
    "date" DATE NOT NULL,
    "category" "OtherCategory" NOT NULL,
    "description" TEXT,
    "amount" DECIMAL(12,2) NOT NULL,
    "paid_by" TEXT,
    "note" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "other_expenses_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE INDEX "users_status_idx" ON "users"("status");

-- CreateIndex
CREATE UNIQUE INDEX "members_user_id_key" ON "members"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "members_email_key" ON "members"("email");

-- CreateIndex
CREATE UNIQUE INDEX "monthly_cycles_year_month_key" ON "monthly_cycles"("year", "month");

-- CreateIndex
CREATE INDEX "monthly_members_member_id_idx" ON "monthly_members"("member_id");

-- CreateIndex
CREATE UNIQUE INDEX "monthly_members_monthly_cycle_id_member_id_key" ON "monthly_members"("monthly_cycle_id", "member_id");

-- CreateIndex
CREATE INDEX "meals_member_id_idx" ON "meals"("member_id");

-- CreateIndex
CREATE INDEX "meals_monthly_cycle_id_date_idx" ON "meals"("monthly_cycle_id", "date");

-- CreateIndex
CREATE UNIQUE INDEX "meals_monthly_cycle_id_member_id_date_key" ON "meals"("monthly_cycle_id", "member_id", "date");

-- CreateIndex
CREATE INDEX "food_expenses_monthly_cycle_id_date_idx" ON "food_expenses"("monthly_cycle_id", "date");

-- CreateIndex
CREATE INDEX "payments_monthly_cycle_id_date_idx" ON "payments"("monthly_cycle_id", "date");

-- CreateIndex
CREATE INDEX "payments_member_id_idx" ON "payments"("member_id");

-- CreateIndex
CREATE INDEX "house_rents_member_id_idx" ON "house_rents"("member_id");

-- CreateIndex
CREATE UNIQUE INDEX "house_rents_monthly_cycle_id_member_id_key" ON "house_rents"("monthly_cycle_id", "member_id");

-- CreateIndex
CREATE INDEX "other_expenses_monthly_cycle_id_date_idx" ON "other_expenses"("monthly_cycle_id", "date");

-- AddForeignKey
ALTER TABLE "members" ADD CONSTRAINT "members_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "monthly_members" ADD CONSTRAINT "monthly_members_monthly_cycle_id_fkey" FOREIGN KEY ("monthly_cycle_id") REFERENCES "monthly_cycles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "monthly_members" ADD CONSTRAINT "monthly_members_member_id_fkey" FOREIGN KEY ("member_id") REFERENCES "members"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "meals" ADD CONSTRAINT "meals_monthly_cycle_id_fkey" FOREIGN KEY ("monthly_cycle_id") REFERENCES "monthly_cycles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "meals" ADD CONSTRAINT "meals_member_id_fkey" FOREIGN KEY ("member_id") REFERENCES "members"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "food_expenses" ADD CONSTRAINT "food_expenses_monthly_cycle_id_fkey" FOREIGN KEY ("monthly_cycle_id") REFERENCES "monthly_cycles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "food_expenses" ADD CONSTRAINT "food_expenses_paid_by_fkey" FOREIGN KEY ("paid_by") REFERENCES "members"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payments" ADD CONSTRAINT "payments_monthly_cycle_id_fkey" FOREIGN KEY ("monthly_cycle_id") REFERENCES "monthly_cycles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payments" ADD CONSTRAINT "payments_member_id_fkey" FOREIGN KEY ("member_id") REFERENCES "members"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "house_rents" ADD CONSTRAINT "house_rents_monthly_cycle_id_fkey" FOREIGN KEY ("monthly_cycle_id") REFERENCES "monthly_cycles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "house_rents" ADD CONSTRAINT "house_rents_member_id_fkey" FOREIGN KEY ("member_id") REFERENCES "members"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "other_expenses" ADD CONSTRAINT "other_expenses_monthly_cycle_id_fkey" FOREIGN KEY ("monthly_cycle_id") REFERENCES "monthly_cycles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "other_expenses" ADD CONSTRAINT "other_expenses_paid_by_fkey" FOREIGN KEY ("paid_by") REFERENCES "members"("id") ON DELETE SET NULL ON UPDATE CASCADE;

