-- AlterTable
ALTER TABLE "ItemCategory" ADD COLUMN     "parentId" INTEGER;

-- AddForeignKey
ALTER TABLE "ItemCategory" ADD CONSTRAINT "ItemCategory_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "ItemCategory"("id") ON DELETE SET NULL ON UPDATE CASCADE;
