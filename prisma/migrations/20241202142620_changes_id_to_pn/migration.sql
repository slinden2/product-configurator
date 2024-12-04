/*
  Warnings:

  - The primary key for the `part_numbers` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - You are about to drop the column `id` on the `part_numbers` table. All the data in the column will be lost.
  - Added the required column `pn` to the `part_numbers` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "part_numbers" DROP CONSTRAINT "part_numbers_pkey",
DROP COLUMN "id",
ADD COLUMN     "pn" TEXT NOT NULL,
ADD CONSTRAINT "part_numbers_pkey" PRIMARY KEY ("pn");
