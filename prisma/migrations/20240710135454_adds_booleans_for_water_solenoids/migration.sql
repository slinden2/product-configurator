/*
  Warnings:

  - Added the required column `has_water_1_solenoid` to the `configurations` table without a default value. This is not possible if the table is not empty.
  - Added the required column `has_water_2_solenoid` to the `configurations` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "configurations" ADD COLUMN     "has_water_1_solenoid" BOOLEAN NOT NULL DEFAULT FALSE,
ADD COLUMN     "has_water_2_solenoid" BOOLEAN NOT NULL DEFAULT FALSE;
