/*
  Warnings:

  - You are about to drop the column `userId` on the `Question` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "Question" ADD COLUMN "createdByUserId" TEXT;

-- Backfill from existing owner so this migration is safe for non-empty tables
UPDATE "Question"
SET "createdByUserId" = "userId"
WHERE "createdByUserId" IS NULL;

-- AlterTable
ALTER TABLE "Question" ALTER COLUMN "createdByUserId" SET NOT NULL;

-- CreateIndex
CREATE INDEX "Question_createdByUserId_idx" ON "Question"("createdByUserId");

-- AddForeignKey
ALTER TABLE "Question" ADD CONSTRAINT "Question_createdByUserId_fkey" FOREIGN KEY ("createdByUserId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- DropForeignKey
ALTER TABLE "Question" DROP CONSTRAINT "Question_userId_fkey";

-- DropIndex
DROP INDEX "Question_userId_idx";

-- AlterTable
ALTER TABLE "Question" DROP COLUMN "userId";
