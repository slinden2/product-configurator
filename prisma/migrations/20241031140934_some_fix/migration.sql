/*
  Warnings:

  - The values [NONE] on the enum `SupplyFixingType` will be removed. If these variants are still used in the database, this will fail.

*/
-- AlterEnum
BEGIN;
CREATE TYPE "SupplyFixingType_new" AS ENUM ('POST', 'WALL');
ALTER TABLE "configurations" ALTER COLUMN "supply_fixing_type" TYPE "SupplyFixingType_new" USING ("supply_fixing_type"::text::"SupplyFixingType_new");
ALTER TYPE "SupplyFixingType" RENAME TO "SupplyFixingType_old";
ALTER TYPE "SupplyFixingType_new" RENAME TO "SupplyFixingType";
DROP TYPE "SupplyFixingType_old";
COMMIT;

-- AlterTable
ALTER TABLE "configurations" ALTER COLUMN "supply_fixing_type" DROP NOT NULL;
