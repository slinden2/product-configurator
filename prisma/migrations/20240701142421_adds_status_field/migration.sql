-- CreateEnum
CREATE TYPE "Status" AS ENUM ('OPEN', 'LOCKED', 'CLOSED');

-- AlterTable
ALTER TABLE "configurations" ADD COLUMN     "status" "Status" NOT NULL DEFAULT 'OPEN';
