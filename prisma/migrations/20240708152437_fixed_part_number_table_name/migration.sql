/*
  Warnings:

  - You are about to drop the `PartNumber` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropTable
DROP TABLE "PartNumber";

-- CreateTable
CREATE TABLE "part_numbers" (
    "id" TEXT NOT NULL,
    "description" TEXT NOT NULL,

    CONSTRAINT "part_numbers_pkey" PRIMARY KEY ("id")
);
