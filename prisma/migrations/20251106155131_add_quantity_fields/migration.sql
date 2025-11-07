-- AlterTable
ALTER TABLE "Item" ADD COLUMN     "quantity" INTEGER NOT NULL DEFAULT 0;

-- AlterTable
ALTER TABLE "ItemCategory" ADD COLUMN     "quantity" BOOLEAN NOT NULL DEFAULT false;
