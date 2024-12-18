/*
  Warnings:

  - The values [CHASSIS_WASH,LOW_HIGH_SPINNERS] on the enum `HpPump30kwOutletType` will be removed. If these variants are still used in the database, this will fail.

*/
-- AlterEnum
BEGIN;
CREATE TYPE "HpPump30kwOutletType_new" AS ENUM ('CHASSIS_WASH_HORIZONTAL', 'CHASSIS_WASH_LATERAL_HORIZONTAL', 'LOW_SPINNERS_HIGH_BARS', 'LOW_MEDIUM_SPINNERS', 'HIGH_MEDIUM_SPINNERS');
ALTER TABLE "configurations" ALTER COLUMN "pump_outlet_1_30kw" TYPE "HpPump30kwOutletType_new" USING ("pump_outlet_1_30kw"::text::"HpPump30kwOutletType_new");
ALTER TABLE "configurations" ALTER COLUMN "pump_outlet_2_30kw" TYPE "HpPump30kwOutletType_new" USING ("pump_outlet_2_30kw"::text::"HpPump30kwOutletType_new");
ALTER TYPE "HpPump30kwOutletType" RENAME TO "HpPump30kwOutletType_old";
ALTER TYPE "HpPump30kwOutletType_new" RENAME TO "HpPump30kwOutletType";
DROP TYPE "HpPump30kwOutletType_old";
COMMIT;
