/*
  Warnings:

  - You are about to drop the column `configurationId` on the `wash_bays` table. All the data in the column will be lost.
  - You are about to drop the column `configurationId` on the `water_tanks` table. All the data in the column will be lost.
  - Added the required column `configuration_id` to the `wash_bays` table without a default value. This is not possible if the table is not empty.
  - Added the required column `configuration_id` to the `water_tanks` table without a default value. This is not possible if the table is not empty.

*/
-- DropForeignKey
ALTER TABLE "wash_bays" DROP CONSTRAINT "wash_bays_configurationId_fkey";

-- DropForeignKey
ALTER TABLE "water_tanks" DROP CONSTRAINT "water_tanks_configurationId_fkey";

-- AlterTable
ALTER TABLE "wash_bays" DROP COLUMN "configurationId",
ADD COLUMN     "configuration_id" INTEGER NOT NULL;

-- AlterTable
ALTER TABLE "water_tanks" DROP COLUMN "configurationId",
ADD COLUMN     "configuration_id" INTEGER NOT NULL;

-- AddForeignKey
ALTER TABLE "water_tanks" ADD CONSTRAINT "water_tanks_configuration_id_fkey" FOREIGN KEY ("configuration_id") REFERENCES "configurations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "wash_bays" ADD CONSTRAINT "wash_bays_configuration_id_fkey" FOREIGN KEY ("configuration_id") REFERENCES "configurations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
