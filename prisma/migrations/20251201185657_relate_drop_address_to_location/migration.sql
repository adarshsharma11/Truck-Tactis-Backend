/*
  Warnings:

  - You are about to drop the column `dropAddress` on the `Job` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "Job" DROP COLUMN "dropAddress",
ADD COLUMN     "dropAddressId" INTEGER;

-- AddForeignKey
ALTER TABLE "Job" ADD CONSTRAINT "Job_dropAddressId_fkey" FOREIGN KEY ("dropAddressId") REFERENCES "Location"("id") ON DELETE SET NULL ON UPDATE CASCADE;
