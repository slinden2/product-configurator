/*
  Warnings:

  - Changed the type of `brush_color` on the `configurations` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.

*/
-- CreateEnum
CREATE TYPE "BrushColor" AS ENUM ('BLUE_SILVER', 'GREEN_SILVER', 'RED', 'GREEN_BLACK');

-- AlterTable
ALTER TABLE "configurations" DROP COLUMN "brush_color",
ADD COLUMN     "brush_color" "BrushColor" NOT NULL;
