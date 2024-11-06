/*
  Warnings:

  - You are about to drop the column `has_water_1_solenoid` on the `configurations` table. All the data in the column will be lost.
  - You are about to drop the column `has_water_2_solenoid` on the `configurations` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "configurations" DROP COLUMN "has_water_1_solenoid",
DROP COLUMN "has_water_2_solenoid";
